# Nexus Enterprise — CreateUser Reference Architecture

A single use case — **create a user** — implemented with the same rigor an
enterprise platform team would apply to their entire system: **DDD**,
**CQRS**, **Clean/Hexagonal Architecture**, **Dependency Injection**
(Awilix), a **transactional outbox**, **OpenTelemetry** tracing/metrics,
and a full test pyramid. The goal is not "a CRUD endpoint" — it's a
demonstration of how every box in the architecture diagram below maps to
real, working, tested TypeScript.

```
CLIENT → EDGE (DNS/CDN/WAF/LB/Gateway) → CROSS-CUTTING (correlation id,
auth, rate limit, CORS, security headers, idempotency, logging) →
INTERFACE (controller → DTO → validation → mapping) → APPLICATION
(Command/Query → Bus → Handler → Use Case) → DOMAIN (Aggregate, VOs,
invariants, domain events) → REPOSITORY + EVENT ARCHITECTURE (outbox →
broker → consumers) → APPLICATION RESULT (mapper → response DTO) → CLIENT
```

## Requirements

- Node.js **>= 24.20.0** (LTS "Krypton") — see `.nvmrc`
- Docker (for Postgres + Jaeger via `docker compose`)

## Stack

| Concern         | Choice                                                           |
| --------------- | ---------------------------------------------------------------- |
| API runtime     | Fastify 5 (TypeScript, ESM)                                      |
| Frontend        | Next.js 16 (App Router, Server Actions, React 19)                |
| Database        | PostgreSQL, accessed via Kysely (type-safe SQL, not a full ORM)  |
| DI container    | Awilix (composition root: `apps/api/src/container.ts`)           |
| CQRS            | Hand-rolled in-process `CommandBus` / `QueryBus`                 |
| Telemetry       | OpenTelemetry SDK (traces + metrics) → OTLP → Jaeger             |
| Validation      | Zod at the HTTP boundary; the domain re-validates business rules |
| Testing         | Vitest — unit / integration (pg-mem) / e2e (Fastify `.inject`)   |
| Auth (password) | bcrypt                                                           |

## Monorepo layout

```
apps/
  api/            Fastify HTTP interface + composition root + telemetry bootstrap
  web/            Next.js client (one page, one server action)
packages/
  domain/         Aggregate, value objects, domain events, domain exceptions — zero framework deps
  application/    CQRS bus, ports (interfaces), the CreateUser use case, DTOs
  infrastructure/ Postgres/Kysely adapters, outbox, bcrypt hasher, OTel decorators
  shared/         Result<T,E>, Logger/Clock/IdGenerator ports used across every layer
```

Dependencies only point **inward**: `infrastructure` and `apps/api` depend
on `application` and `domain`; `domain` depends on nothing but `shared`
(pure value types); `application` depends only on `domain` + `shared`
(ports, never concrete adapters). This is what makes the domain and
application layers unit-testable with plain in-memory fakes — see
`packages/application/test/create-user.handler.spec.ts`.

## The CreateUser flow, end to end

1. **`POST /api/v1/users`** hits Fastify. Cross-cutting middleware has
   already run: a correlation id was assigned (`correlation-id.plugin.ts`),
   security headers/CORS/rate-limiting applied, and an idempotency check
   short-circuits a retried request carrying the same `Idempotency-Key`.
2. **`UserController.createUser`** parses the body with a Zod schema,
   builds a `CreateUserCommand`, and hands it to the `CommandBus`. The
   controller contains no business logic.
3. The bus is wrapped by **`TracedCommandBus`**, which opens an
   OpenTelemetry span named `command.CreateUserCommand` around the whole
   operation and logs structured start/success/failure — cross-cutting
   concerns applied once, at the bus boundary, not scattered through every
   handler.
4. **`CreateUserHandler`** orchestrates: validates the password against
   the `PasswordPolicy` port, checks email uniqueness via the
   `UserRepository` port, hashes the password via the `PasswordHasher`
   port, then asks the domain to construct the aggregate.
5. **`User.register(...)`** (the domain) is the only place a `User` can be
   constructed. It validates every value object (`Email`, `FullName`,
   `HashedPassword`), sets status to `PENDING_VERIFICATION`, and raises a
   `UserCreatedEvent`.
6. The handler persists the aggregate **and** its domain events atomically
   inside a **`UnitOfWork`** transaction — the aggregate row and the
   outbox row are written together, so "user was saved" and "event will be
   published" can never drift apart (transactional outbox pattern).
7. A separate **`OutboxProcessor`** polls the outbox table and dispatches
   `user.created` to registered handlers (welcome email, analytics, audit
   — anything reacting to the fact, decoupled from the request path).
8. The response is mapped back through `UserMapper` to a plain DTO; the
   domain object never leaves the application layer.

## Running it locally

```bash
nvm use                            # or otherwise ensure Node >= 24.20.0
npm install
cp .env.example .env               # adjust as needed
docker compose up -d               # Postgres + Jaeger
npm run migrate --workspace @nexus/infrastructure
npm run dev:api                    # http://localhost:3000
npm run dev:web                    # http://localhost:3001 (or whatever Next picks)
```

Run the test pyramid:

```bash
npm run test:unit          # domain + application, no I/O
npm run test:integration   # repository against pg-mem (in-memory Postgres)
npm run test:e2e           # Fastify .inject(), fakes swapped in via Awilix
npm test                   # everything
```

Traces show up in Jaeger at `http://localhost:16686` once `docker-compose`
is up and a request has been made.

## Why these specific decisions

- **Result over exceptions at boundaries, exceptions for programmer
  errors** — `packages/shared/src/result.ts`. Expected failures (duplicate
  email, weak password) are values the caller must handle; only truly
  exceptional situations throw.
- **Awilix CLASSIC injection** — constructors declare plain, named
  parameters (`constructor(private readonly db: Kysely<Database>)`)
  instead of decorators/reflection metadata, so any class is testable by
  simply calling `new` with fakes, with or without the container.
- **One migration, hand-written** — a real system would use a proper
  migration tool with a numbered directory exactly like
  `packages/infrastructure/src/persistence/postgres/migrations/`; this
  repo has one aggregate, so one migration is honest rather than
  over-engineered.
- **pg-mem for integration tests, not a mocked repository** — exercises
  the actual SQL Kysely generates, catching typos/type mismatches that a
  hand-rolled fake would hide, without requiring Docker in CI for the fast
  suite.

## What's deliberately out of scope

Full authentication/authorization, email verification flow, refresh
tokens, and a real message broker (Kafka/SQS) in place of the outbox
polling loop — the brief was to go deep on **one** use case's
architecture, not build a full identity platform. The seams (ports) are
all in place for each of these to be added without touching the domain or
application layers.
