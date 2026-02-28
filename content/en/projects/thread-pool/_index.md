---
title: "Work Stealing Thread Pool"
description: "Implementing a thread pool in C"
bookcase_cover_src: "cover/c.png"
bookcase_cover_src_dark: "cover/c-dark.png"
type: "postcard"
date: 2026-02-28
weight: 9600
---

# Work Stealing Thread Pool

{{< icon-group gap="14px" >}}
{{< icon vendor="feather" name="github" link="https://github.com/asHawcker/work-stealing-thread-pool" >}}
{{< /icon-group >}}

---

Building my custom memory allocator completely rewired how I think about RAM. And now I know how to manage space (memory), and now I need to learn how to manage CPU time efficiently.

So, I decided I wanted to build a thread pool in C.

As I started digging into the research, I learned about how thread pools actually work, Although I already had a vague idea.

For this project, I’m building a decentralized, work-stealing task scheduler from scratch.

## The Global Lock Trap

When I first learnt about thread pools, I was taught the classic Producer-Consumer model wherein we create an array of worker threads, put them to sleep, and wake them up when tasks are pushed to a single, centralized global queue.

Logically, it makes total sense. But issues arise as we scale.

The core issue is contention. Every single time a thread wants to push or pop a task, it has to fight the other threads for a global mutex lock. Also, because the queue's metadata (like head and tail pointers) sit right next to each other in memory, multiple physical CPU cores are constantly fighting for ownership of that specific cache line. They end up invalidating each other's L1 caches across the motherboard bus.

This is called **Cache Line Bouncing**. Basically, the CPUs spend more time missing cache and competing for lock.

## False Sharing Problem

I read that just distributing the queues in software isn't enough. If two worker queues happen to be allocated right next to each other in RAM, they might accidentally share the same 64-byte CPU cache line. The hardware will treat this as a collision, and I'll recreate the exact bottleneck I was trying to escape without even realizing it. This was a lot of reading about cache lins and trying to understand how they work and how I can fix the issue here.

To fix this, I use memory alignment (alignas(64) and posix_memalign) to physically pad my data structures. This forces the hardware to keep them isolated.

# Summary

This was a fairly short project especially compared to the memory allocators. It was overall fun and on the easier side. This is again very far from what real systems like goroutines and Java use but I got to understand the barebones that build them up. It's just more added complexity for the specific use cases.
