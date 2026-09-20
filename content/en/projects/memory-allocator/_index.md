---
title: "Custom Memory Allocators"
description: "Many implementations of a memory allocator in C"
bookcase_cover_src: "cover/c.png"
bookcase_cover_src_dark: "cover/c-dark.png"
type: "postcard"
date: 2026-01-21
weight: 9700
---

# Memory Allocators

{{< icon-group gap="14px" >}}
{{< icon vendor="feather" name="github" link="https://github.com/asHawcker/custom-memory-allocators" >}}
{{< /icon-group >}}

---

A memory allocator is a runtime utility that manages dynamic memory for a process by allocating and freeing blocks from the heap. It tracks used and free regions and requests more memory from the operating system when needed, aiming to balance performance and memory efficiency.
It tries to keep fragmentation as minimum and have fast allocation while using reasonable memory for overheads.

## My thought behind the project

The main goal I picked up this project is to understand the memory allocation on a lower level and understand how the kernel manages memory which I think will be helpful when I do the other projects that I have on my to-do list.

## Kickstart

I start by trying to clear up the my understanding and get into further detail on how memory allocators work and what types of those exist. I was able to get the basic idea from this [article](https://arjunsreedharan.org/post/148675821737/memory-allocators-101-write-a-simple-memory). It explains the basic working of the allocator very well.

Now, I looked into what other approaches are used in real-world software, and I came across different types of them. Here is a short overview.

### Memory Allocators and few of its types

| Architecture  | Implementation Difficulty | Allocation Speed | Coalescing Speed | Fragmentation   | Best For                           |
| ------------- | ------------------------- | ---------------- | ---------------- | --------------- | ---------------------------------- |
| Implicit List | Very Easy                 | Slow O(N)        | Slow O(N)        | High            | Learning / Tiny Embedded           |
| Explicit List | Medium                    | Medium O(Free)   | Fast O(1)        | Low             | General Purpose / Systems Learning |
| Segregated    | Hard                      | Fast O(1)        | Fast O(1)        | Low             | Production (glibc)                 |
| Buddy         | Medium                    | Fast O(1)        | Very Fast O(1)   | High (Internal) | OS Page Management                 |
| Slab          | Easy (if fixed size)      | Instant          | Instant          | Zero            | Kernel Objects / Games             |

1. **Implicit Free List (The "Naive" Approach)**
   This is similar to the article mentioned above.
   The blocks form a list just by being adjacent in memory. To find a free block, you start at the beginning of the heap and jump from header to header (using the size field) until you find one with allocated == 0. It is the absolute simplest to implement.

2. **Segregated Free Lists (The "Bucket" Approach)**
   This is the "Pro" version of the Explicit List we are building.
   Instead of one long list of free blocks, you have an array of lists (buckets) for different sizes.
   - Bucket 0: Blocks of 16-31 bytes.
   - Bucket 1: Blocks of 32-63 bytes.
   - Bucket N: Blocks > 4KB. _etc_

3. **The Buddy System (The "Binary" Approach)**
   Used by the Linux Kernel (Page Allocator).
   Memory is always split into powers of two. If you need 14KB, we round up to 16KB.
   - Splitting: If we have a 64KB block, we split it into two 32KB "buddies." One is used, the other is free.
   - Coalescing: This is the magic. Because blocks are powers of 2, we can find the address of a block's "buddy" using a simple XOR bitwise operation. We don't need boundary tags!
   - Tradeoff: Very fast coalescing, but suffers from Internal Fragmentation. (If you ask for 33KB, you get 64KB, wasting 31KB).

4. **Slab / Pool Allocators**
   Used by the Linux Kernel (kmalloc) and high-performance game engines.

   Concept: Fragmentation happens because we mix different sizes (16 bytes next to 10MB). Slab allocators solve this by having separate "pools" for specific object types.

   We grab a huge chunk (4KB) and cut it into strictly 32-byte slots. There is no complex splitting or coalescing; just a bitmap or list of slots.

5. **Thread-Caching Allocators**
   Examples: tcmalloc (Google), jemalloc (Facebook/FreeBSD).

   In multi-threaded apps, a single lock on the heap destroys performance.

   To solve this, every thread here gets its own tiny "Mini-Heap" (Thread Local Cache).
   Small allocations come from the thread's local cache.
   Only when the local cache is empty does the thread talk to the central global heap (which uses locks).

[Buddy and Slab Allocators lecture at University of Toronto](https://www.youtube.com/watch?v=OvZyZaMC0f0)

## Conclusion

I am going to be starting from the basic one and slowly buliding up to the more complex ones.
