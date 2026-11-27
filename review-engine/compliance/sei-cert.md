# SEI CERT C Coding Standard: code review checklist

Source: SEI CERT C Coding Standard, Rules for Developing Safe, Reliable, and Secure Systems, Software Engineering Institute, Carnegie Mellon University, https://wiki.sei.cmu.edu/confluence/display/c/SEI+CERT+C+Coding+Standard (the rules are also published at https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/). The checks below are written in our own words. The IDs are the CERT C rule IDs, so a finding can be traced back to the official rule. The CERT Oracle Secure Coding Standard for Java is a separate standard and is not covered here.

The CERT C rules are about code that has undefined or unsafe behaviour in C, such as memory errors, integer errors and unsafe use of library functions. The checks below are the rules whose breach can be seen by reading code.

## When this applies

Apply these checks to changes in C source and header files, and to C code mixed into other projects. If the change has no C code, such as documentation, styling, or code in another language, report this standard as `not_applicable`.

Some rules need whole-program knowledge, such as how big a buffer is at the call site. Report a breach only when the risky pattern is visible in the change or in the code it clearly calls.

## Checks

### [CERT C STR31-C] String buffers are big enough for the characters and the terminating null byte
Look for: a fixed-size array filled with `strcpy`, `strcat`, `sprintf`, `gets` or `scanf("%s")` from input whose length isn't bounded. A buffer sized for the text length without room for the null byte. Bounded calls where the bound is the wrong number, such as the source size instead of the destination size.
Not a breach: copies from a constant that clearly fits.
Decided from code: yes.

### [CERT C STR32-C] Strings passed to string functions are always null-terminated
Look for: `strncpy` or `memcpy` into a buffer that is then used as a string with no terminator written. `read` or `fread` data treated as a string without adding a terminator. Wide and narrow buffers mixed so the end is never found.
Decided from code: yes.

### [CERT C ARR30-C] Array indexes and pointer arithmetic stay inside the array
Look for: an index taken from input, a loop counter or a length with no range check before use. Loops that run one past the end (`<=` against the size). Pointers moved past the end and then dereferenced.
Decided from code: partly. If the bound is checked far from the use, it can't always be seen in the change.

### [CERT C ARR38-C] Library functions get sizes that keep them inside the objects
Look for: `memcpy`, `memmove`, `memset`, `fread`, `snprintf` and similar calls where the count can be larger than the destination or source object. A `sizeof` of a pointer used where the size of the array was meant. A count that is a product or sum that may overflow before the call.
Decided from code: yes.

### [CERT C MEM30-C] Memory isn't used after it is freed
Look for: a pointer used after `free` or `realloc` with no reassignment. A freed pointer kept in a struct or global and used later. The same pointer freed on one path and read on an error path. Use of the old pointer after `realloc` moved the block.
Decided from code: yes.

### [CERT C MEM31-C] Dynamic memory is freed once it's no longer needed
Look for: an allocation with early `return` or `goto` paths that skip the `free`. Memory allocated in a loop and never released. Error handling that frees some of several allocations and leaks the rest.
Decided from code: yes.

### [CERT C MEM34-C] Only memory that was allocated dynamically is freed
Look for: `free` called on a pointer to a stack variable, a global, a string literal or the middle of a block. Pointers that can refer to either static or heap data and are freed without telling which.
Decided from code: yes.

### [CERT C MEM35-C] Allocations are large enough for the object
Look for: `malloc(sizeof(ptr))` where the size of the pointed-to type was meant. Allocation sizes worked out from a length with no allowance for a header or terminator. A size computed from a multiplication with no overflow check, such as `malloc(n * sizeof(T))` where `n` comes from outside.
Decided from code: yes.

### [CERT C INT30-C] Unsigned arithmetic doesn't wrap unnoticed where it matters
Look for: unsigned additions or multiplications on lengths, sizes or offsets from untrusted sources, feeding allocation, indexing or copy sizes, with no check for wrap-around. Subtractions of unsigned values that can go below zero.
Decided from code: yes.

### [CERT C INT31-C] Integer conversions don't lose or change values
Look for: a wider value stored in a narrower type, or a signed value in an unsigned type, such as `size_t` to `int` or a negative `int` passed as a length. Return values like `ssize_t` or `int` from `read` stored in unsigned variables before the error check.
Decided from code: yes.

### [CERT C INT32-C] Signed arithmetic doesn't overflow
Look for: signed addition, subtraction, multiplication, negation or `abs` on values that can come from outside, with no range check first. Checks written after the operation, which come too late because signed overflow is undefined.
Decided from code: yes.

### [CERT C INT33-C] Division and remainder never use a zero divisor
Look for: `/` or `%` where the divisor comes from input or a computation that can be zero, with no check. A check for zero that is missing for the signed minimum divided by -1 case.
Decided from code: yes.

### [CERT C EXP34-C] Null pointers are not dereferenced
Look for: the result of `malloc`, `calloc`, `fopen`, `getenv`, `strchr` or similar used with no null check. Pointers checked after they were already dereferenced. Error paths that leave a pointer null and continue.
Decided from code: yes.

### [CERT C EXP33-C] Memory is not read before it is initialised
Look for: local variables used on a path where they were never assigned. Structs from `malloc` read without being filled. Partly filled buffers copied out to another system or to the caller.
Decided from code: yes.

### [CERT C FIO30-C] User input is never used as a format string
Look for: `printf(buf)`, `syslog(msg)`, `fprintf(f, input)` and similar calls where the format argument is not a constant string and may contain outside data.
Decided from code: yes.

### [CERT C FIO45-C] File access doesn't leave a gap between checking and using
Look for: `access` or `stat` followed later by `open` or `fopen` on the same path. Temporary files created with names that can be guessed, instead of through `mkstemp`. Missing `O_EXCL` or `O_NOFOLLOW` where the path may be controlled by someone else.
Decided from code: yes.

### [CERT C ENV33-C] Commands aren't run through `system`
Look for: `system`, `popen` or `execl*("/bin/sh", "-c", ...)` with a string built from variable data. A shell used where `execv`-style calls with an argument array would do.
Decided from code: yes.

### [CERT C ERR33-C] Errors from standard library functions are detected and handled
Look for: return values ignored from functions that can fail, such as `malloc`, `fopen`, `fread`, `fwrite`, `fclose`, `fgets`, `snprintf` or `strtol`. Code that carries on with a bad value after a failure.
Decided from code: yes.

### [CERT C MSC41-C] Sensitive data is not written into source code
Look for: passwords, API keys, tokens or private keys as string or array literals, or in headers, that real systems accept.
Not a breach: placeholders in tests and examples that can't reach a real system.
Decided from code: yes.
