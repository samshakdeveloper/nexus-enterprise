# ADR-006: Use PostgreSQL for persistence, isolated behind ports

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The system stores users and other core business data that is relational and
consistency-critical. It also uses the transactional outbox pattern: the
aggregate and its domain events must be saved in one atomic transaction and
published afterwards, so no event is lost or published for a rolled-back
change.

At the same time, the choice of database should not leak into business
code, and a different store must remain possible if a workload demands it.

## Decision

We use **PostgreSQL** with **Kysely** (a type-safe SQL query builder, no
ORM) and keep it entirely behind ports:

- The application layer defines `UserRepositoryPort` and `UnitOfWorkPort`
  in terms of domain objects. They contain no SQL, no Kysely types, and no
  database-specific error codes.
- Infrastructure implements them in `persistence/postgres`, including
  the user repository, unit of work, outbox store, and migrations.
  Database-specific details, such as mapping the unique-violation error
  code to a domain error, stay inside these adapters.
- Domain events are written to an outbox table in the same transaction as
  the aggregate and published to Kafka afterwards (see ADR-001).
- The Awilix composition root is the only place that binds the Postgres
  adapters to the ports (see ADR-005).

## Consequences

**Positive**

- Strong ACID transactions make the outbox pattern straightforward and
  reliable.
- A relational model with constraints fits the domain, and Kysely gives
  compile-time checked queries without ORM magic.
- Domain and application layers are unaffected by database changes.

**Negative / trade-offs**

- Switching databases means replacing the repository, unit-of-work, outbox,
  and migration implementations. Domain and application code stay
  unchanged, but the work is more than a single adapter.
- A different store must provide equivalent atomicity for aggregate plus
  outbox writes. For example, MongoDB supports this only through
  multi-document transactions on a replica set.
- Certain workloads (for example very high-volume, write-heavy messaging)
  may eventually fit a different store better. The port boundary exists so
  that such a service can move without rewriting business logic.

## Alternatives considered

- **MongoDB:** flexible schema and horizontal scaling, but the domain is
  relational and consistency-critical, and the outbox guarantee depends on
  replica-set transactions.
- **MySQL/MariaDB:** viable and similar in guarantees, but PostgreSQL offers
  a richer feature set (JSON types, constraints, extensions) that we may
  rely on.
- **ORM (Prisma, TypeORM):** faster to start, but they tend to leak model
  and decorator concerns toward inner layers and hide the SQL we want to
  control.
