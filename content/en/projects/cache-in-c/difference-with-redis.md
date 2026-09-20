---
date: "2026-02-28T15:07:42+05:30"
title: "Differences with Redis"
toc: true
toc_position: "right"
weight: 1
---

{{< breadcrumbs >}}

---

# Differences with Redis

While my cache uses a lot of the same concepts (is closer to how Memcached works), Redis takes a completely different, almost opposite approach to solving the same problems.

1. Concurrency and Synchronization
   - **My Implementation (Multi-Threaded / Lock Striping)**: I utilized an array of `pthread_mutex_t` locks to shard the cache, allowing up to 16 threads to operate in parallel. While this leverages multi-core processors, it introduces OS-level context switching and synchronization overhead.

   - **Redis (Single-Threaded Event Loop)**: Redis bypasses multi-threaded synchronization entirely for command execution. It relies on an asynchronous, single-threaded event loop (via `epoll`). By ensuring only one thread accesses the data structures at a time, Redis eliminates mutexes, lock contention, and context-switching penalties, maximizing raw memory access speeds.

2. Eviction Strategy and Overhead
   - **My Implementation (Strict LRU)**: The cache maintains an `O(1)` Doubly Linked List to track the precise order of access. However, this introduces a "Write-on-Read" penalty: every `get()` operation requires updating pointers to move the accessed node to the MRU position. This invalidates CPU caches across cores and requires an additional 16 bytes of pointer overhead per cached item.

   - **Redis (Pseudo-LRU)**: Redis avoids the linked list entirely. Instead, it embeds a 24-bit timestamp clock into each object. During eviction, Redis randomly samples a subset of keys and evicts the oldest among the sample. This probabilistic approach saves gigabytes of memory at scale and ensures read operations do not trigger expensive memory writes.

3. Collision Resolution and Resizing Mechanics
   - **My Implementation (Open Addressing)**: I utilized a contiguous array with linear probing and `TOMBSTONE` markers. This optimizes for spatial locality, as the CPU prefetcher efficiently scans contiguous memory. However, resizing the hash table at capacity is a blocking operation, temporarily halting all operations on that specific shard.

   - **Redis (Separate Chaining + Incremental Rehashing)**: Redis uses linked lists to handle bucket collisions and solves the resizing bottleneck through Incremental Rehashing. When expanding, it allocates a second table and incrementally migrates a small number of keys during each subsequent command. This distributes the `O(N)` computational cost over time, preventing latency spikes.

4. Expiration Policy
   - **My Implementation (Lazy Expiration)**: The cache checks the TTL timestamp only upon a get() request. While this reduces background CPU overhead to zero, it allows unrequested expired items to occupy memory indefinitely until forced out by capacity limits.

   - **Redis (Lazy + Active Expiration)**: Redis utilizes lazy expiration but supplements it with an active background cycle. It routinely samples keys with TTLs and aggressively deletes expired entries, ensuring memory is reclaimed even for unaccessed "ghost" data.

---

Seeing how Redis tackles these exact same bottlenecks with completely different architectural choices (like single-threading and pseudo-LRU) makes me appreciate systems engineering so much more.
