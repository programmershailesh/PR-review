# Rust

**Safety**: `unwrap` and `expect` on reachable failure paths in services; `unsafe` without a stated invariant; integer casts with `as` that truncate.

**Async**: blocking calls inside tokio tasks without `spawn_blocking`; a `std::sync::Mutex` guard held across `.await`; unbounded channels; spawned tasks with no cancellation or join.

**Performance**: needless `clone` on hot paths; `collect` then iterate; `Arc<Mutex<_>>` where channels or ownership would be simpler.

**API design**: public error types that lock in dependencies; breaking semver in library crates; `String` parameters where `&str` or `impl Into<String>` fits the local convention.
