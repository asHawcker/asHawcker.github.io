---
date: "2026-09-22T19:14:59+05:30"
title: "Clipboard history - Understanding the X11 ownership model"
weight: 1
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Learning about X11 and The In-Memory Ring Buffer

I knew what I wanted:

> Detect when the user copies something get the text and store it.

Now, I had to understand how will I put this into code and what tools and libraries are at my disposal.

My first approach was very simple. I thought the clipboard could be checked like a variable.
I imagined the clipboard as a variable that I could check again and again. It felt like an approach.

Every 500 milliseconds I would ask X11 for the clipboard contents.
This actually works enough to prove the concept, but, polling wastes resources.

## Understanding the X11 clipboard

This was probably the real rabbit hole of the project. I started to dig into the X11 internals. Here's what I learned:

Clipboard data is handled through **Selections**.
The `CLIPBOARD` selection is the selection used by applications for normal copy and paste operations. It is the default channel for clipboard data.

An application takes ownership of that selection. The owner holds the data until another application takes over.

For example: `Firefox -------- owns CLIPBOARD selection --------> X11 Server`

When I copy something in Firefox, Firefox becomes the clipboard "owner".
My daemon only needs to know when the ownership changes.

That is where **XFixes** becomes useful. XFixes can notify me when the clipboard ownership changes.

## Using XFixes instead of polling

The XFixes extension lets a client subscribe to selection ownership changes.
My daemon creates a small hidden dummy window and asks X11 to send selection owner change events to it.

{{< emgithub target="https://github.com/asHawcker/clipboard-history-for-linux/blob/main/src/x11_backend.c#L39-L50" lang=c tab_size=8 >}}

<!--
```c
clipboard_atom = XInternAtom(dpy, "CLIPBOARD", False);
. . .
XFixesSelectSelectionInput(dpy, dummy_win, clipboard_atom, XFixesSetSelectionOwnerNotifyMask);
``` -->

The daemon now has an event source.

Instead of repeatedly asking. I can wait for X11 to tell me.

Here is the flow:

<img src="/images/cliphistory/X11 copy.png" style="height: auto; width: auto;" />

---

## The dummy window

The daemon needed an X11 window because selections and selection conversion are built around X11 windows.
I do not need a window. So I create an unmapped dummy window and used it as the receiver for selection-related operations.

## Getting the clipboard text

Receiving the "selection owner changed" event only tells me that something changed. It does not give me the text. So, I then ask the current clipboard owner to convert its selection to a target format such as `UTF8_STRING`.

The simplified logic is:

{{< emgithub target="https://github.com/asHawcker/clipboard-history-for-linux/blob/main/src/x11_backend.c#L93-L96" lang=c tab_size=0 >}}

<!-- ```c
XConvertSelection(
    display,
    clipboard,
    utf8_atom,
    property_atom,
    dummy_window,
    CurrentTime
);
``` -->

The data is then delivered through the X11 selection protocol.

```text
Clipboard changed
    ↓
XFixes notification
    ↓
Request UTF8_STRING
    ↓
Selection owner responds
    ↓
Data arrives in a property
    ↓
Read property
    ↓
Copy into buffer
```

Now, I have the data stored in the In-memory Ring Buffer, which is basically a Circular Queue of size 50.

{{< emgithub target="https://github.com/asHawcker/clipboard-history-for-linux/blob/main/include/ring_buffer.h#L7-L24" lang=c tab_size=0 >}}

<!-- ```c
#define MAX_CLIPS 50

typedef struct {
    char *data;
    size_t len;
} Clip;

typedef struct {
    Clip clips[MAX_CLIPS];
    size_t head;
    size_t count;
} ClipBuffer;
``` -->

O(1) insertion is important here and it is the justification for the choice of this data structure.

When the history reaches 50 entries, the oldest entry is overwritten.

This part of the project highlighted the importance of event-driven programming. Imporved my understaning of `polling` and `event-driven design`.

# Next

My daemon now captures clipboard history and store it.

The selected text was sitting in the clipboard. Now more about the paste process.

---

{{< breadcrumbs >}}
