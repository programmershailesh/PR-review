# JavaScript and TypeScript

**TypeScript**: `any` and unchecked `as` at trust boundaries; request bodies and external data used without runtime validation; non-exhaustive unions.

**Async**: floating promises; `await` in a loop where bounded concurrency fits; unbounded `Promise.all` over user-sized input; CPU work blocking the event loop; missing `AbortSignal` or timeouts on outbound calls.

**React**: state derived in `useEffect` instead of during render; unstable props defeating `memo`; array index keys on reorderable lists; stale closures; effects without cleanup; missing virtualization for long lists. Check the React version before suggesting newer APIs.

**Next.js**: server secrets reaching client components; wrong caching assumptions for the pinned version; server actions without authorization checks.

**Node servers**: a slow call holding a DB transaction open; missing pool limits; synchronous `fs` or crypto on request paths; errors leaking stack traces; listeners never removed.

**Prisma and ORMs**: N+1 via lazy relations; `findMany` without `take`; check-then-write that needs a unique constraint or transaction.
