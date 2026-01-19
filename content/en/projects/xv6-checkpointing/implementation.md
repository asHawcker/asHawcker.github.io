---
date: "2025-11-26T09:19:23+05:30"
title: "Implementations - xv6 checkpointing"
weight: 2
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Implementation Details

This section details the specific code modifications required to implement the checkpointing
feature.

## System Call Registration

To expose the new functionality to user space, new system calls were registered in the standard
xv6 interface files.

### Header Modifications

In syscall.h, unique numbers assigned to the new calls:

```
#define SYS_checkpoint 22
#define SYS_restart 23
```

In user.h, the function prototypes:

```
int checkpoint (int pid , char _ filename ) ;
int restart ( char _ filename ) ;
```

In usys.S, the entry points:

```
SYSCALL ( checkpoint )
SYSCALL ( restart )
```

### Kernel Dispatch Table

In syscall.c, the sycall kernel handlers registered:

```
extern int sys_checkpoint ( void ) ;
extern int sys_restart ( void ) ;
static int (\* syscalls []) ( void ) = {
    // ... existing syscalls ...
    [ SYS_checkpoint ] sys_checkpoint ,
    [ SYS_restart ] sys_restart ,
};
```

## Kernel Functionality Extensions

Helper functions were added to core kernel files to support process lookup and memory traversal.

### Process Lookup (proc.c)

A function was added to locate a process structure by its PID. This is essential for external
checkpointing, where the target process is not the currently running one.

```
struct proc *
findproc (int pid )
{
    struct proc _ p ;
    // Iterate over ptable to find the matching PID
    for ( p = ptable . proc ; p < & ptable . proc [ NPROC ]; p ++) {
        if(p - > pid == pid ) {
            return p ;
        }
    }
    return 0;
}
```

The prototype struct proc\* findproc(int); added to defs.h.

### Page Table Traversal (vm.c)

The walkpgdir function, normally static, is now exposed to allow sysfile.c to traverse ex-
ternal page tables. This allows the checkpoint system call to read the memory of a different process.
_// In vm.c: Removed ’static ’ keyword_

```
pte*t * walkpgdir ( pde*t * pgdir , const void* va , int alloc )
{
// ... existing implementation ...
}
```

## Core Checkpointing Logic (sysfile.c)

The main parts of the implementation is in sysfile.c.

### Memory Copy Helper

A helper function copy from pgdir is implemented to read memory from a target process’s
page table into a kernel buffer. This handles the virtual-to-physical address translation for
remote processes.

```
int
copy_from_pgdir ( pde_t * pgdir , void * dst_k , uint src_va , uint len )
{
    uint va = src_va ;
    uint end = src_va + len ;
    char * d = ( char *) dst_k ;
    while ( va < end ) {
        uint va0 = ( uint ) PGROUNDDOWN ( va ) ;
        pte_t * pte = walkpgdir ( pgdir , ( void *) va0 , 0) ;

        // Check if page exists
        if( pte == 0 || (* pte & PTE_P ) == 0) {
            memset (d , 0 , end - va ) ;
            break ;
        }

        uint pa = PTE_ADDR (* pte ) ;
        uint offset = va - va0 ;
        uint chunk = PGSIZE - offset ;
        if( chunk > ( end - va ) ) chunk = end - va ;

        char *src_k = ( char *) P2V ( pa ) ; // Convert to Kernel Virtual Address
        memmove (d , src_k + offset , chunk ) ;

        va += chunk ;
        d += chunk ;
    }
    return 0;
}
```

### The Checkpoint System Call

The sys checkpoint function handles file creation, header writing, and memory serialization.
It includes logic to handle the xv6 transaction log size limit by writing data in small chunks.

```
int
sys*checkpoint ( void )
{
    int pid ;
    char * filename ;
    struct proc * p ;
    struct inode * ip ;
    struct check_point_header hdr ;
    if( argint (0 , & pid ) < 0 || argstr (1 , & filename ) < 0) return -1;

    p = findproc ( pid ) ;
    if( p == 0) {
    cprintf (" Checkpoint : PID %d not found .\n", pid ) ;
    return -1;
    }

    // Populate Header
    hdr.id = CHECKPOINT_HEADER_ID ;
    hdr.pid = p -> pid ;
    hdr.sz = p -> sz ;
    hdr.tf = *p -> tf ;
    safestrcpy ( hdr.name , p - > name , sizeof ( hdr . name ) ) ;

    // Create file
    begin_op () ;
    if (( ip = create ( filename , 2 , 0 , 0) ) == 0) {
    end_op () ;
    return -1;
    }
    if( writei ( ip , ( char *) & hdr , 0 , sizeof ( hdr ) ) != sizeof ( hdr ) ) {
    iunlockput ( ip ) ;
    end_op () ;
    return -1;
    }
    end_op () ;

    // Save Memory Loop
    int written = 0;
    uint addr = 0;
    uint size = p - > sz ;

    while ( written < size ) {
        int n = size - written ;
        if( n > 1024) n = 1024; // 1KB chunks
        char kbuffer [1024];

        // Use efficient memmove for self , or page walker for others
        if( p == myproc () ) {
            memmove ( kbuffer , ( void *) addr , n ) ;
        } else {
            copy_from_pgdir (p - > pgdir , kbuffer , addr , n ) ;
        }

        // Write chunk in its own transaction
        begin_op () ;
        if( writei ( ip , kbuffer , sizeof ( hdr ) + written , n ) != n ) {
            cprintf (" Checkpoint : write failed \n") ;
            iunlockput ( ip ) ;
            end_op () ;
            return -1;
        }
        end_op () ;
        written += n ;
        addr += n ;
    }
    begin_op () ;
    iunlockput ( ip ) ;
    end_op () ;
    return 0;
}
```

### The Restart System Call

The sys restart function reads the image file, validates the magic number, resizes the current
process memory, and restores the CPU state.

```
int
sys*restart ( void )
{
    char * path ;
    struct inode *ip ;
    struct check_point_header hdr ;
    struct proc * p = myproc () ;
    if( argstr (0 , & path ) < 0) return -1;

    begin_op () ;
    if (( ip = namei ( path ) ) == 0) {
        end_op () ;
        return -1;
    }
    ilock ( ip ) ;

    // Read and Validate Header
    if( readi ( ip , ( char *) & hdr , 0 , sizeof ( hdr ) ) != sizeof ( hdr ) ) {
        iunlockput ( ip ) ;
        end_op () ;
        return -1;
    }
    if( hdr . id != CHECKPOINT_HEADER_ID ) {
        cprintf (" Restart Error : Invalid Magic Number .\n") ;
        iunlockput ( ip ) ;
        end_op () ;
        return -1;
    }

    // Resize process memory to match saved state
    if( hdr . sz > p - > sz ) {
        if (( p - > sz = allocuvm (p - > pgdir , p - > sz , hdr . sz ) ) == 0) {
            iunlockput ( ip ) ;
            end_op () ;
            return -1;
        }
    } else if( hdr . sz < p - > sz ) {
        p - > sz = deallocuvm (p - > pgdir , p - > sz , hdr . sz ) ;
    }

    // Restore Memory Content
    int read_bytes = 0;
    uint addr = 0;
    uint size = hdr . sz ;

    while ( read_bytes < size ) {
        char kbuffer [1024];
        int n = size - read_bytes ;
        if( n > sizeof ( kbuffer ) ) n = sizeof ( kbuffer ) ;

        if( readi ( ip , kbuffer , sizeof ( hdr ) + read_bytes , n ) != n ) {
            cprintf (" Restart : read failed \n") ;
            iunlockput ( ip ) ;
            end_op () ;
            return -1;
        }
        memmove (( void *) addr , kbuffer , n ) ;
        read_bytes += n ;
        addr += n ;
    }

    // Restore CPU state
    *p - > tf = hdr . tf ;
    p - > tf - > eax = 0; // Set return value to 0

    iunlockput ( ip ) ;
    end_op () ;
    return 0;
}
```
