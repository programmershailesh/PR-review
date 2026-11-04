# C# and .NET

**Async**: `.Result` and `.Wait()` causing deadlocks or starvation; `async void` outside event handlers; missing `CancellationToken` propagation.

**EF Core**: N+1 and lazy loading in loops; client-side evaluation; `ToList` before filtering; missing `AsNoTracking` on read-heavy queries; a `DbContext` shared across threads or captured by a singleton.

**ASP.NET Core**: scoped services captured by singletons; `HttpClient` created per request instead of `IHttpClientFactory`; missing authorization on new endpoints; entities returned directly.

**Performance**: allocations in hot paths; LINQ in tight loops; large object heap churn from big arrays.
