---
date: "2026-09-22T20:10:23+05:30"
title: "Clipboard History - Ipc and Kernel Input"
weight: 2
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Building Kernel Keystroke Injection and IPC Security

At this point, I needed to solve two different problems:

1. How does the CLI safely tell the daemon what to do?
2. How does the daemon make the active application actually receive the paste?

The first problem taught me more about `UNIX` sockets. The second took me to `/dev/uinput`.

---

## UNIX Domain Sockets

I used a local `AF_UNIX` socket rather than TCP localhost beacuse it is designed for IPC for processes on the same machine. The socket lives in the user's runtime directory, under `$XDG_RUNTIME_DIR`.

I also use restrictive permissions (`0600`) so the socket is not treated as a public interface. But permissions alone are not enough, the daemon should not blindly trust every connection.

This is where I read about `SO_PEERCRED`. With a UNIX socket, Linux can provide credentials for the peer process. The check prevents a different Unix user from talking to my daemon through the IPC interface. It does **not** solve the problem of a malicious process already running as the same user.

That is a fundamental limitation of many user-space desktop utilities.

{{< emgithub target="https://github.com/asHawcker/clipboard-history-for-linux/blob/main/src/ipc_server.c#L72-L87" lang=c tab_size=8 >}}

<!-- ```c
struct ucred credentials;
socklen_t len = sizeof(credentials);

if (getsockopt(
        client_fd,
        SOL_SOCKET,
        SO_PEERCRED,
        &credentials,
        &len
    ) == -1) {

    close(client_fd);
    return;
}

if (credentials.uid != getuid()) {
    close(client_fd);
    return;
}
``` -->

The important part is that the daemon does not trust a UID supplied by the client. The kernel provides the credentials. That is a much more trustworthy.

---

## The paste

After selecting an item, my daemon can put that text into the X11 clipboard. But I still need to trigger the paste action in the active application.

The obvious idea was `Shift + Insert` or `Ctrl + V`. So I looked at ways to generate keyboard input. I found two main approaches.

---

### Approach 1: XTest

XTest can synthesize keyboard and pointer input from X11.
The architecture would be roughly:

```text
clipd --> XTest --> X11 --> Application
```

This is very convenient, but, since this is synthetic input so the applications can distinguish or restrict injected events in different ways. I needed to bypass that.

### Approach 2: `/dev/uinput`

Then I found the Linux `uinput` interface.
Instead of pretending to be an X11 program pressing a key, I can create a **virtual input device**.

The architecture becomes:

```text
clipd --> /dev/uinput --> Linux input subsystem --> active applications
```

From the kernel's point of view, my daemon is creating a virtual keyboard. That is a much lower-level solution. Therefore, It also means I have to deal with the kernel device interface and permissions.

I decided to go with this and mess with this aspect too.

The final system crosses multiple abstraction layers. It utilises concepts like,

- userspace process communication
- an IPC security boundary
- X11 selection ownership
- Linux device APIs
- kernel input handling

---

## The uinput implementation

I create a virtual keyboard and emit key events.

For `Shift+Insert`:

```text
KEY_LEFTSHIFT = 1
KEY_INSERT    = 1
KEY_INSERT    = 0
KEY_LEFTSHIFT = 0
```

Every state change is written as an input event.

{{< emgithub target="https://github.com/asHawcker/clipboard-history-for-linux/blob/main/src/uinput_backend.c#L72-L91" lang=c tab_size=8 >}}

<!-- ```c
struct input_event ev;

ev.type = EV_KEY;
ev.code = KEY_LEFTSHIFT;
ev.value = 1;
write(uinput_fd, &ev, sizeof(ev));

ev.code = KEY_INSERT;
ev.value = 1;
write(uinput_fd, &ev, sizeof(ev));

ev.code = KEY_INSERT;
ev.value = 0;
write(uinput_fd, &ev, sizeof(ev));

ev.code = KEY_LEFTSHIFT;
ev.value = 0;
write(uinput_fd, &ev, sizeof(ev));
```` -->

The implementation also needs the correct event synchronization and device setup.
The important idea is that I am not asking an application to paste.
I am producing input that the Linux input system can deliver to applications.

---

## Permissions HELLLL!!!

Normal users generally do not have arbitrary write access to input devices. I did not want to run the whole daemon as root. That would be too privileged for a clipboard manager.

So instead, the machine needs a `udev` rule or equivalent device permission setup that allows my user to access `/dev/uinput`.
That keeps the rest of the process unprivileged.

# Next

Now that the daemon and client are working. I had to make it feel like a real Linux utility instead of a program I manually launched from a terminal.

So I started looking into systemd, packaging, permissions and trying to make the whole thing installable as a `.deb` package.
