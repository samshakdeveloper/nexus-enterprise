# ADR-007: Use Kysely's built-in Migrator for schema migrations

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The PostgreSQL schema (users, outbox, and later tables) must evolve in a
controlled, repeatable, and versioned way across development, CI, and
production. We already use Kysely as the query builder (see ADR-006), so
the migration tool should fit the same stack and avoid extra dependencies.

The project is an ESM TypeScript monorepo, and migrations must run the
same way on Windows, Linux, and CI. Kysely's default file provider does
not handle ESM dynamic imports reliably on Windows.

## Decision

We use the **Migrator** that ships with Kysely:

- Migrations are ordered, numbered TypeScript files in
  `packages/infrastructure/src/persistence/postgres/migrations/files`
  (for example `0001_create_users_and_outbox.ts`), each exporting `up`
  and `down`.
- A small custom `MigrationProvider` (`EsmFileMigrationProvider`) loads the
  files with `import()` using `file://` URLs, which fixes the ESM path
  problem on Windows.
- `npm run migrate` runs `migrateToLatest()` against `DATABASE_URL`, prints
  the status of each migration, and exits with a non-zero code on failure.
- Migrations use the same database connection factory as the application,
  so there is one way to configure and reach the database.

## Consequences

**Positive**

- No additional migration framework: no second query builder and no extra
  dependency to keep in sync with Kysely.
- Migrations are type-checked TypeScript and use the same API as
  application queries.
- Failed migrations stop with a clear exit code, which fits CI/CD.

**Negative / trade-offs**

- We maintain a small custom provider for ESM compatibility.
- Migrations are run explicitly via a script; wiring them into the
  deployment pipeline (for example as a Kubernetes job) is a separate step
  that is not yet part of this decision.
- Kysely's migrator is intentionally minimal, so features such as dry
  runs or advanced rollback tooling are not available out of the box.

## Alternatives considered

- **Knex migrations:** mature and feature-rich, but would add a second
  query-builder dependency next to Kysely only for migrations.
- **Umzug (with a custom storage/runner):** flexible migration runner, but
  requires extra glue code, while Kysely's migrator already covers our
  needs.
- **Prisma Migrate / TypeORM migrations:** tied to ORM models that we do
  not use and want to keep out of inner layers.
- **Plain SQL files with a shell script:** simple, but no ordering/locking
  guarantees and no shared connection or typing.
