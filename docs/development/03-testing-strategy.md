# Testing Strategy

TypeScript code is tested with [Vitest](https://vitest.dev). The Go `pdf-worker` uses `go test`. This document explains what kinds of tests exist, where they live, and how to run them.

## Kinds of tests

| Level       | What it checks                                         | Examples                                                                 |
| ----------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| Unit        | One class or function, with no external services       | Value objects and the `User` aggregate, `CreateUserHandler`, the password policy, `Result`, the bcrypt hasher, the email worker handler |
| Integration | An adapter against a Postgres-compatible database      | The user repository, the outbox repository of `event-worker`             |
| End-to-end  | One use case through the HTTP layer of the API         | `create-user.e2e.spec.ts`                                                |
| Go          | The `pdf-worker` internals                             | PDF generator, Kafka consumer, use case                                  |

### Unit tests

Most tests are here. They sit in the `test/` folder of each package, for example `packages/domain/test` and `packages/application/test`. The domain and application layers have no framework or database dependencies, so these tests are fast and need no setup.

### Integration tests

The outbox repository test in `apps/event-worker/test/integration` first tries a local Postgres (`DATABASE_URL`, or `postgresql://postgres:postgres@localhost:5432/test_outbox_db` if it is not set). If none is reachable, it starts a Postgres container with Testcontainers, so Docker needs to be running.

### End-to-end test

`apps/api/test/create-user.e2e.spec.ts` builds the Fastify app through the composition root and replaces the repository, password hasher, event publisher and unit of work with in-memory fakes. It needs no database or Kafka.

### Go tests

The `pdf-worker` tests are next to the code in `apps/pdf-worker/internal`: the PDF adapter, the Kafka consumer and the use case.

## Running the tests

```bash
npm test                # all TypeScript packages, through Turborepo
npm run test:go         # pdf-worker
npm run test:all        # both of the above
npm run test:watch      # Vitest in watch mode, from the repository root
npm run test:coverage   # all TypeScript tests with a coverage report
```

To run the tests of one package:

```bash
npm test --workspace @nexus/domain
```

Test files are named `*.spec.ts` and live in a `test/` folder inside each package or app. The workspace packages point their `main` field at `src/index.ts`, so you do not need to build before running tests.

## Configuration

The root [`vitest.config.ts`](../../vitest.config.ts) is used by `test:watch` and `test:coverage`. It finds every `*.spec.ts` and `*.test.ts` file in the repository and sets a 30 second timeout for tests and a 60 second timeout for hooks. Coverage uses the `v8` provider. No minimum coverage threshold is configured yet.

Each package's own `test` script runs `vitest run --dir test`, and uses `--passWithNoTests` where a package may have no tests.

## In CI

Pull requests run `npm run test:coverage` and `npm run test:go` in the `Automated Tests & Coverage` job of `ci-main.yml`. The job only starts after lint passes. The pre-commit hook also runs `npm run test` and `npm run test:go` (see [Engineering Standards](02-standards-enforcement.md)).



