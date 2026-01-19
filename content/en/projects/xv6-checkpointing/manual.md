---
date: "2025-11-26T09:19:23+05:30"
title: "Usage Manual - xv6 checkpointing"
weight: 3
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Usage Manual

This section provides instructions on how to use the implemented system calls in user-space
programs.

## Creating a Checkpoint

Use the _checkpoint(int pid, char \*filename)_ system call.

- **pid**: The Process ID of the target process to save. Use getpid() for self-checkpointing.
- **filename**: The name of the file to be created (e.g., ”backup.img”).
- **Returns**: 0 on success, -1 on failure.

## Restoring a Process

Use the _restart(char \*filename)_ system call.

- **filename**: The path to a valid checkpoint image file.
- **Behavior**: If successful, this function does not return anything. Instead, the process
  memory is overwritten, and execution resumes from the saved context (the point where
  checkpoint was called).

## Inspecting an Image

Use the imginfo command-line tool to inspect a file without loading it.

```
$ imginfo save.img
=== Checkpoint Image Info ===
File: save.img
Status: VALID XV6 Checkpoint
Orig Name: test_prog
Orig PID: 4
Mem Size: 12288 bytes
```
