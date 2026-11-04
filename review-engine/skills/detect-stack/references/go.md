# Go

**Concurrency**: goroutines with no exit path; ignored `context.Context`; shared maps without synchronization; mutexes held across I/O; unbuffered sends that can block forever; `time.After` in hot loops.

**Errors**: ignored errors; lost context from missing `%w`; `panic` in library code.

**HTTP**: default client with no timeout; response body not closed; server without timeouts; `r.RemoteAddr` used as a client identity (it includes the port, and sits behind proxies).

**Memory and performance**: unbounded maps and caches; missing slice preallocation on hot paths; holding small slices of large arrays; loop-variable capture on Go versions before 1.22 (check `go.mod`).

**Design**: interfaces defined at the producer rather than the consumer; package-level mutable state that blocks tests and multiple instances.
