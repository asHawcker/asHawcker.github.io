---
date: "2026-02-27T22:28:08+05:30"
title: "Slab Allocator"
weight: 1001
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Slab Allocator

The Slab Allocator is the top layer of the kernel's memory management stack. While the Buddy Allocator manages raw 4KB pages, the Slab Allocator acts as a "retailer", carving those pages into small, fixed-size objects (like inodes, task structs, or integers) to eliminate internal fragmentation.

## The Problem with Buddy: Internal Fragmentation

The Buddy Allocator has a Granularity problem. Lets say I need 32 bytes to store an integer. But the smallest unit the Buddy allocator it can give is 4KB (4096 bytes). As a result, we waste 4064 bytes (99.2%) of memory. This is called **Internal Fragmentation**.

The Solution to this is _Pre-Cut Slabs._
The Slab Allocator solves this by pre-allocating chunks of memory (called Slabs) and dividing them into equal-sized slots. It requests a 4KB page from the Buddy Allocator. It divides that 4KB page into 128 slots of 32 bytes. If you need 32 bytes, it gives you exactly 32 bytes so we have 0% wastage.

## Architecture

The system is organized into a hierarchy of three components:

1. The Cache (`kmem_cache_t`): It manages three lists of slabs.
2. The Slab (`slab_t`): It is the container. it represents one 4KB page that has been sliced up.
3. The Page: The raw physical memory (from Buddy).

```
       +-----------------------+
       |   kmem_cache_t        |  <-- The Manager
       +-----------------------+
       | [Full List]   --------+-----> (Slabs with 0 free slots)
       | [Partial List] -------+-----> (Slabs with some free slots)
       | [Free List]   --------+-----> (Slabs with all slots free)
       +-----------------------+
                 |
                 v
       +-----------------------+
       |      slab_t           |  <-- The Metadata for ONE Page
       +-----------------------+
       | bitmap: 00110...      |  <-- Tracks used slots (1=Used, 0=Free)
       | free_count: 5         |
       | page_start: *ptr      |
       +-----------------------+
                 |
                 v
       +-------------------------------------------------------+
       |  4KB Raw Page (Order 0 Block from Buddy)              |
       +-------------------------------------------------------+
       | [ Obj 0 ] [ Obj 1 ] [ Obj 2 ] [ Obj 3 ] ...           |
       +-------------------------------------------------------+
```

---
