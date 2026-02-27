---
date: "2026-02-27T22:58:18+05:30"
title: "Memory Allocators - Wrapup"
weight: 1002
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Post wrapup thoughts

Phew!! Finally completed this project. It has been quite a journey finding time for the project and completing bit by bit everyday. Finally it has come to an end and what a journey it has been. It taught me so much about memory allocation and so many little things about the underlying systems.
This is still so far from anything which would work in real life, but atleast I know more about these and will be ready for any upcoming challenges. I got quite late with the blog though but its chill.

**It was a FUN journey. Makes me more interested in the low level systems.**

---

# Summary

1. **The Implicit Free List (The Beginner Approach)**
   I started super simple. I just took a block of memory and added a `size` tag before every allocation. To find free space, my malloc had to loop through the entire heap, jumping over the blocks that were already taken.
   - **The Good**: Really easy to code, and barely wastes any space.
   - **The Bad**: _O(N)_ Performance. As my heap filled up, malloc got slow because it had to check almost everything to find a free spot.

2. **The Explicit Free List (The Standard malloc)**
   Looping through everything was a massive waste of CPU cycles. So, I added next and prev pointers inside the free blocks themselves. This turned my free memory into a Doubly Linked List.
   - **The Good**: _O(K)_ performance. Now, malloc only had to look at the free blocks, no matter how big the total heap was. It was way faster.
   - **The Bad**: Pointers are a headache!!. Managing the pointer math while splitting or merging blocks caused so many bugs.

3. **The Buddy Allocator**
   Next, I looked at how the OS Kernel does things. The OS needs memory in continuous chunks (pages). So, I built a system that divides memory strictly into powers of two (like 4KB, 8KB, 16KB). A block could only merge with its specific mathematical "Buddy".
   - **The Good**: Lightning Fast. I used bitwise math (XOR) to find buddies instead of searching through lists. This helped eliminate "External Fragmentation".
   - **The Bad**: Internal Fragmentation. If I asked for 5KB, the system was forced to give me 8KB. That’s 3KB completely wasted.

4. **The Slab Allocator**
   Finally, I built a layer that takes those big pages from the Buddy Allocator and chops them into fixed-size "Slabs".
   - **The Good**: Zero Fragmentation. I used 100% of the memory perfectly for those specific objects.
   - **The Bad**: It's super specific. A 32-byte slab cache can't give you a 64-byte object.

---

# Key Learnings

1. The Trade-off bwetween **Speed** and **Wasted Space**

Building these taught me that memory management is always a compromise.

_External Fragmentation: When your free memory is chopped into tiny, useless pieces scattered everywhere. (The Buddy Allocator fixes this)._
_Internal Fragmentation: When you give a program more memory than it asked for, wasting the extra space. (The Slab Allocator fixes this)._

There is no perfect allocator. Still the standard malloc tries to balance both.

2. Metadata Corruption is a Nightmare
   This was the most painful lesson. Every block has a tiny 4-byte header right before the user's data. If I messed up and wrote ptr[-1] = 0 in my test script, I accidentally overwrote my own block's size.
   The worst part was that the crash wouldn't happen immediately. It would happen 10,000 cycles later when my free function tried to read that garbage data and jumped to a random memory address. Debugging this really tested my sanity.

---

# Final Thoughts

Building these allocators was the ultimate C programming test. Going from a slow _O(N)_ scanner to a super-fast _O(1)_ Slab Allocator was very EXHILARATING.

---
