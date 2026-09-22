---
date: "2026-09-22T23:33:31+05:30"
title: "Clipboard History - Systemd and Packaging"
weight: 3
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# From a C Program to a Linux Utility

## Making the daemon start automatically

I did not want to run `./clipd &` every time I logged into Ubuntu.
I wanted the daemon to behave like a normal background service.
Since this is a user application, I used a **systemd user service**.

I turned this into a systemd service unit:

{{< emgithub target="https://github.com/asHawcker/clipboard-history-for-linux/blob/main/clipd.service#L1-L13" lang=c tab_size=8 >}}

<!-- ```ini
[Unit]
Description=Clipboard History Engine

[Service]
ExecStart=/usr/bin/clipd
Restart=on-failure

[Install]
WantedBy=default.target
``` -->

The exact install path and options can differ depending on the package layout, but the basic idea is simple.

Systemd takes care of:

- starting the daemon
- restarting it after failure
- keeping it attached to the user session
- integrating it with normal Linux service management

## Why a user service instead of a system service?

This was another design decision I had to take. The clipboard should be user-specific. Reason is simply the seperation for different users. A system service would also make the privilege model more complicated.

A user service gives me:

```text
User A
  └── clipd
      └── User A clipboard

User B
  └── clipd
      └── User B clipboard
```

---

## The `.deb` package

I packaged the project as a Debian package because Ubuntu is my primary target.

The package layout is roughly:

```text
/
├── usr/
│   └── bin/
│       ├── clipd
│       └── clipboard
│
└── usr/
    └── lib/
        └── systemd/
            └── user/
                └── clipd.service
```

## Performance

One of my goals was to keep the daemon tiny.

There is:

- no database
- no background polling timer
- no heavy GUI
- no network stack
- no giant runtime

The daemon ended up using roughly **400 KB of RAM in my observed setup**. This is way good and almost nothing.

# Learnings

Although not heavy in RAM usage, this was one of the most heavy projects on my head, in the sense that it taught me a LOT and there was so much for me to take in. I learnt about display servers, IPC, Security, uinput, systemd, deb packaging, etc...

I started with a small quality-of-life problem. I finished with a much better understanding of Linux.

And, finally, my muscle memory is at peace.

---

# Overall, I'd say it was a Win V situation....

( get it? Win V, Win WIn, WIn + V )

# Thank You for reading. If anything, Feel free to reach out to me.

---
