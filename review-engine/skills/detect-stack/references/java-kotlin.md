# Java, Kotlin and Spring

**Spring**: `@Transactional` on private methods or self-invocation, where it has no effect; remote calls inside transactions; field injection where the repo uses constructors; blocking calls in WebFlux; endpoints returning entities directly.

**JPA and Hibernate**: N+1 from lazy associations; `EAGER` on collections; missing pagination; open-session-in-view reliance; `equals` and `hashCode` on mutable entities; missing `@Version` where lost updates matter.

**Concurrency**: unbounded executors; `ThreadLocal` leaks on pooled threads; shared non-thread-safe objects such as `SimpleDateFormat`. Check the JDK before suggesting virtual threads, and watch for pinning.

**Kotlin**: `!!` on external data; `GlobalScope`; blocking inside coroutines without the right dispatcher.

**Migrations**: Flyway or Liquibase changes that are not backward compatible with the running version.
