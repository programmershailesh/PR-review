# SQL, schemas and migrations

**Migrations**: locks on large tables (a new index without `CONCURRENTLY`, column rewrites, adding `NOT NULL` without a safe path); code and schema that are not compatible during a rolling deploy, where expand-and-contract is needed; irreversible changes without a stated plan.

**Integrity**: rules enforced only in application code where a unique, foreign key or check constraint belongs; check-then-insert races; floats for money.

**Queries**: unbounded results; `OFFSET` pagination on deep pages; functions on indexed columns; `SELECT *` on wide tables; indexes that do not match the query's filter and sort order; too many indexes on write-heavy tables.

**Transactions**: wrong isolation assumptions; long transactions; network calls inside a transaction; inconsistent lock order that can deadlock.
