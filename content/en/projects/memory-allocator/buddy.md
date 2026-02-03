---
date: "2026-01-30T22:28:08+05:30"
title: "Buddy"
weight: 1000
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Buddy Allocator

Previously, I built an Explicit Free List Allocator. It is fast and efficient for general user-space applications (`malloc`).

But when we look at the Operating System Kernel, the requirements change. The OS doesn't just need any memory, it often needs physically contiguous memory to interface with hardware. Our Linked List allocator suffered from External Fragmentation, making it unsuitable for the kernel.

This is where the Buddy Allocator comes in.

## The Core Problem: Fragmentation vs. Speed

In a standard allocator, if you free a 100-byte block and a 50-byte block that are far apart, they remain separate holes. You cannot merge them.The Buddy System solves this by enforcing strict rules:

- Powers of Two: Every block size is _2^k_ (4KB, 8KB, 16KB...).
- The Buddy Rule: A block can only merge with its unique "Buddy" (the other half it was split from).

This structure implicitly forms a Binary Tree over the memory, allowing us to split and merge blocks at lightning speed without traversing a list.

## The Architecture

Unlike the Linked List allocator, we don't have one single list. We have an Array of Lists, where each index corresponds to an "Order" (power of 2).

We managed 1MB of simulated RAM with 4KB pages.

- Order 0: 4KB blocks

- ...

- Order 8: 1MB blocks

```
#define MAX_ORDER 8
static block_t *free_list[MAX_ORDER + 1];

typedef struct block_t {
    struct block_t *next;
    struct block_t *prev;
    int order;
    int is_free;
} block_t;
```

The `block_t` struct is stored inside the free memory block itself (Overlaying). We don't allocate extra memory for metadata.

# Implementation and Challenges

In a Linked List, finding a neighbor is (O(N)). In a Buddy System, we needed to find our neighbor in O(1). We learned that "Buddies" differ by exactly one bit in their address.

- Address `0x0000` (Size 4096) XOR 4096 -> `0x1000` (Right Buddy).
- Address `0x1000` (Size 4096) XOR 4096 -> `0x0000` (Left Buddy). This allowed us to calculate merge candidates using a single CPU instruction without touching memory.

### Allocation (Recursive Splitting)

When a user asks for 4KB (Order 0) but we only have 1MB (Order 8):

1.  Check Order 0. Empty.
2.  Check Order 1... up to Order 8. Found!
3.  Split Down:
    - 1MB -> 512KB (Keep) + 512KB (Free List 7)
    - 512KB -> 256KB (Keep) + 256KB (Free List 6)
    - ...
    - 8KB -> 4KB (Return) + 4KB (Free List 0)

### Deallocation (Recursive Merging)

When `free(ptr)` is called:

1. Calculate Buddy Address using `ptr ^ size`.
2. Check: Is Buddy free? Is Buddy the same Order?
3. _Yes_: Remove Buddy from list. Merge.
4. _Repeat_: Treat the new bigger block as the target and try to merge up again.

# Conclusion

The Buddy Allocator taught me that by imposing strict rules (Powers of Two), we eliminated External Fragmentation and list traversal costs, trading them for Bitwise Math complexity.

This is also the foundation upon which the Slab Allocator (Object Caching) is built and I am going to look into its implementation next.
