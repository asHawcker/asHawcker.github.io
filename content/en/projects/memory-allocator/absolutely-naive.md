---
date: "2026-01-23T15:04:54+05:30"
title: "Absolutely Naive Allocator"
weight: 1
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Naive Memory Allocator

I implemented the basic allocator implementation mentioned in the [article](https://arjunsreedharan.org/post/148675821737/memory-allocators-101-write-a-simple-memory) mentioned previously.

This is a basic functional allocator. There are a few problems, I can directly figure that we would face.

- freeing is _O(n)_. so as we allocate more and more memory, we will take longer to free the blocks.
- incase all blocks except the last one are freed and then we free the last one, programbreak is only moved till the end of this last block only.
- all the already allocated headers still exist.
- two consecutive free headers may be sufficient together but not alone, but they are checked seperately so none will be allocated and program break needs to be extended.

## malloc() implementation

{{< emgithub target="https://github.com/asHawcker/custom-memory-allocators/blob/main/absolutely-naive-allocator/alloc.c#L30-L61" lang=c tab_size=8 >}}

## free() implementation

{{< emgithub target="https://github.com/asHawcker/custom-memory-allocators/blob/main/absolutely-naive-allocator/alloc.c#L63-L81" lang=c tab_size=8 >}}

# Conclusion

Now proceeding to an implicit free list allocator
