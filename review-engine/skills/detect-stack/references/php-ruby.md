# PHP and Ruby

**Laravel**: N+1 without `with()`; mass assignment via a loose `$fillable` or `$guarded`; large reads without `chunkById` or `lazy`; jobs dispatched inside transactions without `afterCommit`; raw queries with interpolated input; missing policies on new routes.

**Symfony and Doctrine**: lazy-loading loops; flush inside loops; services holding request state under long-running runtimes.

**Rails**: N+1 without `includes`; `update_all` and `update_column` skipping validations unintentionally; callbacks with external side effects; jobs queued before commit (check the Rails version); strong parameters bypassed; migrations locking large tables without `algorithm: :concurrently`.

**Both**: unescaped output in templates; loose comparison in PHP on security checks; unbounded `all` and `each` on large tables.
