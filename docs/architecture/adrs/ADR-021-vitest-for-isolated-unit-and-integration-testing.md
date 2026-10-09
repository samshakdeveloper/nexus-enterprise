# ADR-021: Use Vitest for isolated unit and integration testing

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

The architecture separates pure business logic (domain, application) from
infrastructure. Tests should reflect this: fast, isolated tests for logic,
and realistic tests for adapters that talk to real systems. The test tool
must work with TypeScript and ESM across a monorepo without a heavy
transform setup.

## Decision

We use **Vitest** with tests kept in a `test/` folder next to each package
or app:

- **Unit tests** cover domain value objects, the aggregate, application
  handlers, and policies. They use no I/O and run in milliseconds.
- **Integration tests** cover adapters (for example the user repository
  and the outbox repository) against a real PostgreSQL instance started
  with **Testcontainers**, instead of mocks, so SQL and transactions are
  actually exercised.
- **End-to-end tests** exercise the create-user flow through the API.
- Coverage is collected with `@vitest/coverage-v8` and run in CI.
- Go services use `go test`, run through `npm run test:go`.

## Consequences

**Positive**

- Fast feedback for business logic, thanks to ports that can be replaced
  by simple fakes.
- Adapters are tested against the real database, which catches problems
  mocks hide.
- Native TypeScript/ESM support with a Jest-compatible API and little
  configuration.

**Negative / trade-offs**

- Integration and end-to-end tests need Docker and are slower.
- The `test:unit`, `test:integration`, and `test:e2e` scripts use
  `--project`, but the Vitest configuration does not define projects yet,
  so these scripts must be fixed or the projects added.
- No coverage thresholds are enforced yet.
- There are no frontend (`web`) tests, and the PDF worker is covered only by
  a few Go tests.

## Alternatives considered

- **Jest:** the most common choice, but needs more configuration for ESM
  and TypeScript and is slower.
- **Node's built-in test runner:** no extra dependency, but fewer features
  (mocking, coverage tooling, watch mode).
- **Mocking the database in integration tests:** faster, but does not
  verify real SQL, constraints, or transactions.