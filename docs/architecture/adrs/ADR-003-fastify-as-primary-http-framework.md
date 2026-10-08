# ADR-003: Use Fastify as the HTTP framework behind a port/adapter boundary

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The API needs an HTTP layer with fast routing, schema-based validation,
and a rich plugin ecosystem (CORS, helmet, rate limiting, OpenAPI,
metrics). At the same time, the architecture requires that business logic
(domain and application layers) and the dependency-injection container do
not depend on any specific web framework, so the HTTP framework stays a
replaceable detail.

## Decision

We use **Fastify** as the HTTP framework and integrate it through a port
and adapter:

- `RequestPipelineServerPort` defines the minimal server contract
  (`listen`, `close`).
- `FastifyRequestPipelineAdapter` implements it and owns all Fastify
  specifics: routes, controllers, plugins, error handling, and
  middleware-like concerns (auth, correlation ID, idempotency, logging).
- The Awilix composition root and module registrations have no knowledge
  of Fastify. `main.ts` is the only place that chooses the adapter.
- Request and response schemas are Zod-based and connected to Fastify
  through `fastify-type-provider-zod` (see ADR-004).

## Consequences

**Positive**

- Fast routing and low per-request overhead compared with Express-based
  stacks, which matters for a high-throughput API.
- Built-in schema/validation model and a mature plugin system cover most
  cross-cutting needs without custom code.
- Domain, application, and the DI container remain unaware of the HTTP
  framework and are unaffected if it changes.

**Negative / trade-offs**

- Replacing Fastify means rewriting the whole `presentation/fastify/`
  layer (controllers, routes, plugins), not only the server adapter.
  The core business and wiring code stays untouched.
- Plugin behavior (hooks, encapsulation, lifecycle) is Fastify-specific,
  so moving to another framework requires re-implementing it.
- The team needs to learn Fastify's plugin and lifecycle model.

## Alternatives considered

- **NestJS:** opinionated structure and DI built in, which overlaps with
  Awilix and the existing ports/adapters design and would push framework
  decorators into inner layers. NestJS can run on Fastify, but then the
  framework itself becomes the architectural center.
- **Express:** most familiar and widest ecosystem, but slower routing and
  no built-in schema validation model.
- **Koa / Hono:** lighter, but with a smaller plugin ecosystem for the
  production concerns we need (rate limiting, metrics, OpenAPI).
