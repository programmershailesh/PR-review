# Python

**Language**: mutable default arguments; broad `except` hiding failures; naive datetimes; building lists where generators fit large data.

**Django**: N+1 without `select_related` or `prefetch_related`; `.iterator()` missing on large querysets; `save()` races where `F()` or `update()` fits; side effects before commit instead of `transaction.on_commit`; migrations that lock large tables; missing object-level permission checks.

**FastAPI and asyncio**: blocking calls inside `async def`; sessions shared across tasks; unbounded `gather`; pydantic models that expose internal fields.

**Celery**: model instances as task arguments instead of IDs; tasks that are not idempotent while using `acks_late`; retries without backoff; tasks queued inside an open transaction.

**SQLAlchemy**: lazy loads in loops; sessions outliving a request; implicit autoflush surprises.
