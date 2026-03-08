---
title: "LRU Cache in C"
description: "Implemented a LRU Cache from scratch in C"
bookcase_cover_src: "cover/c.png"
bookcase_cover_src_dark: "cover/c-dark.png"
type: "postcard"
date: 2026-02-28
weight: 9500
toc: true
toc_position: "right"
---

# High-Performance Sharded LRU Cache in C

{{< icon-group gap="14px" >}}
{{< icon vendor="feather" name="github" link="https://github.com/asHawcker/cache-in-c" >}}
{{< /icon-group >}}

---

I've been really interested in how many programs actually work under the hood on a lower level.
Trying to understand how core computing infrastructure works. After finishing up the custom memory allocator and a work-stealing thread pool, I wanted to look into something that sits right at the intersection of memory management and concurrency.

So, I decided to build a high-performance in-memory cache in C from scratch.

I wanted to build something that actually mimics production systems - handling high read/write throughput, concurrent access without choking, and proper memory eviction.

Here is my journey through this project - the core ideas, the problems and my learnings.

## Mechanism vs. Policy

Before writing any C code, I had to get the architecture right. The biggest thing I learnt was understanding the strict separation of Mechanism and Policy.

- The Mechanism (How we store and find data fast): This is an Open-Addressed Hash Table. It gives us _O(1)_ lookups. But a hash table doesn't know anything about time or usage.
- The Policy (How we decide what to kick out): This is a strict LRU (Least Recently Used) policy, implemented using a Doubly Linked List.

The two structures talk to each other. The Hash Table buckets don't store the raw data; they store pointers to the Linked List nodes. When you `get()` a key, the hash table finds it in _O(1)_, and then we detach that node and push it to the "Most Recently Used" head of the linked list.

## The Implementation

The Implementation Roadmap
I broke the project down into stages so I wouldn't drown in pointer arithmetic.

### 1. The Hash Table & Tombstones

I went with Open Addressing (Linear Probing) using the `djb2` hash function instead of separate chaining (linked lists in buckets) because contiguous arrays are much better for CPU cache locality.

But there’s a small tradeoff when you evict an item, you can't just set the bucket to `NULL`. If you do, future lookups will stop probing prematurely and return false misses. I had to implement `TOMBSTONE` markers (basically casting `-1` to a pointer) to tell the search loop to keep looking further.

### 2. The LRU List

Managing a Doubly Linked List in C is usually tough because of the edge cases. I avoided a lot of edge cases by using Sentinel Nodes-a dummy head and a dummy tail. This meant every real node always had a valid prev and next, making the detach and push_front functions incredibly clean.

### 3. Lazy TTL (Time-To-Live)

We need to make sure that the entries expire after a certain amount of time, but running a background cleanup thread seemed like a waste of CPU cycles for this project. Instead, I went with Lazy Expiration. We attach an `expiry_time` timestamp to the node when it's put in. The cache only checks if the item is dead when a user actually calls `get()`. If it's expired, we kill it on the spot and return `NULL`.

### 4. Concurrency

This was one of the most important part of the project. If you have a single `pthread_mutex_t` on the entire cache, your multi-core system turns into a single-thread code. Threads will just sit around waiting for the lock.

Instead, I used Lock Striping (Sharding). I wrapped the base `LRUCache` in a `ShardedCache` struct. It initializes an array of 16(could be something else depending on requirement) independent LRU caches, each with its own mutex. When a key comes in, I hash it and modulo it by 16 to route it to a specific shard. This means 16 threads can read and write simultaneously as long as they hit different shards.

## Issues Faced

Really!! You can never write a C project without blowing up your terminal a few times.

1. Infinite Loops in Linear Probing: My hash_get function was literally just while (`table->buckets[index] != EMPTY`). I forgot to handle the edge case where the table gets completely full of nodes and tombstones but doesn't contain the key. It wrapped around forever. I had to add a `start_index` tracker to break the loop if we scanned the whole array.

2. Teardown Deadlocks: When writing the `sharded_destroy` cleanup function, I tried locking the mutexes while freeing the memory. Bad idea. You should never destroy a mutex while holding it, and destroy should assume all worker threads are already joined.

## What I Learnt

I could feel the OS and HPC(High Performance Computing) course come in handy here. I was able to utilise a lot of what I had learnt in theory.

- Sharding proved to me that just adding more threads at a problem doesn't make it faster if your synchronization primitives are bottlenecking.

- To benchmark the cache hit rate without introducing a new bottleneck, I had to use C11 `stdatomic.h`. Using `atomic_fetch_add_explicit` with `memory_order_relaxed` let me track hits and misses across 8 threads simultaneously without a single mutex. This got me into reading more about stdatomic and understand then this again connect me back to some of the stuff I learnt in the OS course where we were trying to make some parts of the code atomic. This made it so muh more easier.

- Choosing a pointer-based model (where the cache stores `void*` and the user owns the actual malloc'd payload) made the cache super fast, but forces the caller to be responsible about not freeing memory while it's still cached.

- I wrote a benchmarking script that blasts the cache with multiple threads doing 100,000 operations each (skewed 80/20 read-heavy). It processes over 6.4 million operations per second with zero memory leaks (verified by Valgrind). Learnt about tools like valgrind, although I did not go into depth with all these.

## Conclusion

Phew! This was somewhat short project but there was a lot to learn and it was really fun getting to know the subtle details that go into making such systems.
