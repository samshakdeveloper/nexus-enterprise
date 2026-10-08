# Workspace Topology

This document describes how the Nexus Enterprise monorepo is laid out and which parts of the code are allowed to depend on which.

<p align="center">
  <img src="../assets/01/topology-layers-workspaces.svg" alt="Workspace and architecture topology" width="750" />
</p>

---

## Dependency direction

The code is split into layers, and dependencies only point inward:

`shared` ← `domain` ← `application` ← `infrastructure` ← `apps`

An inner layer never imports from an outer one. The rule is checked by ESLint, so a wrong import fails the lint step (details in [DDD & Hexagonal Layers](02-ddd-hexagonal-layers.md)).

In practice this means:

- You can change delivery code in `apps/` (routes, controllers, plugins) without touching `domain`, `application` or `infrastructure`.
- `domain` imports nothing except `shared`, so refactoring a use case in `application` never forces a change in `domain`.

---

## How services communicate

Services do not call each other over HTTP. They communicate through Kafka, using the transactional outbox pattern:

1. The API saves the business change and an outbox row in the same Postgres transaction.
2. `event-worker` polls the outbox table, publishes each event to Kafka, and then sets `processed_at` on the row.
3. Other workers (`email-worker`, `pdf-worker`) consume the events from Kafka.

`event-worker` is the one service that connects to the API's Postgres database, because it has to read the outbox. The other workers never touch it.

Because services only share Kafka messages, they can use different languages. `pdf-worker` is written in Go. The event contracts are defined as Protobuf files in `packages/contracts`.

Delivery is at-least-once, so consumers must handle duplicate messages. See [CQRS & Event-Driven Architecture](03-cqrs-event-driven.md) for the full flow.

---

## Directory layout

### `apps/`

Deployable services. Each one has its own Dockerfile.

| App            | Description                                        |
| -------------- | -------------------------------------------------- |
| `api`          | Fastify server exposing REST and GraphQL           |
| `web`          | Next.js frontend                                   |
| `event-worker` | Reads the outbox table and publishes to Kafka      |
| `email-worker` | Consumes user events and sends emails              |
| `pdf-worker`   | Go service that consumes events and generates PDFs |

### `packages/`

Shared code used by the apps.

| Package          | Description                                                                           |
| ---------------- | ------------------------------------------------------------------------------------- |
| `domain`         | Entities, value objects, aggregates and domain events                                 |
| `application`    | Commands, handlers and the ports they depend on                                       |
| `infrastructure` | Adapters: Postgres repositories, Kafka publisher, outbox, password hashing, telemetry |
| `shared`         | Small utilities such as `Result` and the logger, clock and id-generator ports         |
| `contracts`      | Protobuf definitions for events                                                       |

### `.github/` and `.husky/`

Checks run in two places: locally before a commit, and in CI before a merge.

- [`.github/workflows/`](../../.github/workflows/)
  - `ci-feature.yml` runs lint on pushes to feature branches.
  - `ci-main.yml` runs on pull requests to `development`, `staging` and `main`. It runs lint, type checks, TypeScript and Go tests with coverage, and a full build.
  - `enforce-branch-pipeline.yml` only allows `development` → `staging` → `main` as the merge path.
- [`.husky/`](../../.husky/)
  - `pre-commit` runs lint, formatting and the TypeScript and Go tests.
  - `commit-msg` validates the commit message with commitlint.

### `monitoring/`

Configuration for Prometheus (metrics), Loki (logs), Tempo (traces) and Grafana, started with `docker-compose.monitoring.yml`. Each outbox row stores a trace ID that is passed along when the event is published to Kafka, so a request can be correlated across services. See the [Observability Guide](../operations/01-observability-guide.md).

---

## Turborepo tasks

Task order and caching are defined once in [`turbo.json`](../../turbo.json). An excerpt:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": { "outputs": [] },
    "test": { "outputs": [] }
  }
}
```

`^build` means a package is only built after the packages it depends on are built. For example, `apps/api` waits for `domain`, `application` and `infrastructure`. CI keeps the `.turbo` cache folder between runs to speed up builds.
