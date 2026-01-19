---
date: "2025-11-27T10:31:59+05:30"
title: "Challenges Faced - xv6 checkpointing"
weight: 4
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Challenges Faced

The development of this feature involved overcoming several technical hurdles specific to the
xv6 kernel architecture.

## File System Transaction Limits

The most significant issue was the “transaction too big” kernel panic error. The xv6 journaling
system has a fixed log size. I initially attempting to write the entire process memory which
can exceed tens of kilobytes in a single begin op() / end op() block caused the transaction to
overflow the log buffer.

**Solution**: Redesigned the writing logic to perform incremental writes. Memory is serial-
ized in 1KB chunks, with each chunk wrapped in its own independent transaction. This ensures that no single operation exceeds the journal’s capacity.

## Cross-Process Memory Access

Standard kernel functions like copyin and memmove are designed to operate on the current
process’s page table. When checkpointing an external process (e.g., PID 4 saving PID 5), these
functions fail because they cannot resolve the virtual addresses of the target process.

**Solution**: I exposed the walkpgdir function from the virtual memory subsystem. A
custom copy from pgdir helper is implemented to manually walk the target process’s
page directory, resolve virtual addresses to physical addresses, and map them to kernel
space for reading.

## Header Dependency Conflicts

Implementing the check point header structure required access to struct trapframe. However, including x86.h in sysfile.c caused circular dependency errors with other kernel headers.

**Solution**: The necessary structures (struct trapframe) were manually defined locally
within sysfile.c, ensuring the file could compile.

## File Descriptor Persistence

Processes often have open file descriptors. These refer to kernel-space objects (struct file)
that are transient. Simply saving the integer file descriptor number is insufficient because the
kernel object it points to will not exist upon restoration.

**Solution**: The system introspects the process state before checkpointing. If open file
descriptors are detected, a warning is issued to the console. Upon restoration, these
descriptors are logically closed, preventing undefined behavior.
