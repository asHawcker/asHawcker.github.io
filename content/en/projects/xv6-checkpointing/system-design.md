---
date: "2025-11-26T09:19:23+05:30"
title: "System Design - xv6 checkpointing"
weight: 1
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# System Design

## The checkpoint image format

The checkpoint-ed process is stored as a binary image file with a specific structure. To ensure
data integrity, a header containing metadata is written at the beginning of the file, followed by
the raw memory dump.
The structure of the file is visualized in Figure 1. The header acts as a metadata container,
ensuring that the restoration process has all context required (PID, memory size, and CPU
registers) before it begins loading the raw memory data.

![File Format diagram](/images/xv6/fileformat.png)

The corresponding C structure definition used in the kernel is shown below:

```
# define CHECKPOINT_HEADER_ID 0 xDEADBEEF

struct check_point_header {
uint id ; // Magic number (0 xDEADBEEF )
int pid ; // Original Process ID
uint sz ; // Size of process memory in bytes
char name [16]; // Process name
struct trapframe tf ; // Saved CPU registers
};
```

## System Calls

Two new system calls were introduced:

1. _**int checkpoint(int pid, char \*filename)**_: Locates the target process, freezes its
   state, and streams its memory to disk.
2. _**int restart(char \*filename)**_: Replaces the calling process’s memory and context with
   the data found in the image file.
