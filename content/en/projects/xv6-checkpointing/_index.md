---
title: "Process Checkpointing - xv6"
description: "Modified the xv6 OS to support process checkpointing."
bookcase_cover_src: "cover/c.png"
bookcase_cover_src_dark: "cover/c-dark.png"
type: "postcard"
date: 2025-11-26
---

# Process Checkpointing and Restoration Mechanism in xv6

{{< icon vendor="feather" name="github" link="https://github.com/asHawcker/xv6-process-checkpointing" >}}

---

### What is xv6?

Xv6 is a teaching operating system developed in the summer of 2006 for MIT's operating systems course.

### Abstract

This project implements a process checkpointing and restoration mechanism within
the MIT xv6 operating system. The system allows the kernel to serialize the memory
state and CPU context of a running process into a persistent disk file. A restoration
mechanism allows the kernel to reconstruct the process from this file, resuming execution
from the exact point of interruption.

Key features include support for both self-checkpointing and external process target-
ing, a custom binary file format with id validation, incremental disk writing to bypass file system journal limitations, and open file detection. The implementation required mod-
ifications to the kernel’s memory management subsystem, system call interface and file system.

### What is process Checkpointing?

Process fault tolerance is a critical feature in an operating systems. Checkpointing is the ability
to save the state of a running process to disk storage, allowing it to be resumed later, even
after a system reboot.

### Goal of the project

The goal of this project was to extend the minimal xv6 kernel to support this functionality.
This required an understanding of:

- Virtual Memory: Translating user virtual addresses to physical addresses for serializa-
  tion.

- Context Switching: Capturing the exact state of CPU registers (trapframe).
- File System Internals: Writing large binary blobs from kernel space without violating
  transaction log limits.

(This was a project done for the Operating systems course during my B.Tech studies.)
