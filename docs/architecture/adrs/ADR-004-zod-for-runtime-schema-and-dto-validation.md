# ADR-004: Use Zod as the single schema and validation boundary

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Data enters the system from outside: environment variables and HTTP
requests. Unvalidated input is a common source of production failures and
security issues, and TypeScript types alone do not protect at runtime.

The API also has several consumers (web, mobile, other platforms) that need
an accurate, always-current contract. Handwritten documentation drifts from
the code.

## Decision

We use **Zod** as the single source of truth for external data shapes:

- **Environment:** every service (`api`, `email-worker`, `event-worker`)
  parses its environment with a Zod schema at startup and exits on invalid
  configuration, so misconfiguration fails fast instead of at runtime.
- **HTTP:** request bodies, responses, and error responses are Zod schemas,
  connected to Fastify through `fastify-type-provider-zod` for validation,
  serialization, and inferred TypeScript types (see ADR-003).
- **Documentation:** the OpenAPI specification and Swagger UI are generated
  from the same schemas, and the GraphQL schema is derived from that
  OpenAPI document (see ADR-002). There is no hand-written API documentation.
- **Layering:** Zod validates the _shape_ of incoming data at the boundary.
  Business rules (for example, an email that is well-formed but already
  taken) are validated by the domain. The two layers have different jobs.
  Zod stays in the presentation and configuration layers; the domain and
  application layers do not depend on it.

## Consequences

**Positive**

- One schema produces runtime validation, TypeScript types, and API
  documentation, so they cannot silently diverge.
- Invalid input is rejected before reaching business logic, and invalid
  configuration is rejected before the service starts.
- Any tool that consumes JSON Schema or OpenAPI can be fed from the same
  schemas (client generation, GraphQL, future tooling).

**Negative / trade-offs**

- Documentation is only as complete as the registered schemas; descriptions
  and examples still have to be written by hand inside the schemas.
- Coverage is currently limited to environment and HTTP boundaries.
  Messages consumed from Kafka are parsed as JSON and cast to the event
  envelope type without schema validation. Adding a Zod schema for the
  event envelope is planned.
- The project depends on Zod and on third-party generators.

## Alternatives considered

- **Hand-written OpenAPI plus a separate validator (Ajv, class-validator):**
  two sources of truth that drift apart.
- **TypeScript types only:** no runtime protection against bad input.
- **JSDoc `@openapi` comments:** documentation next to routes, but not tied
  to actual validation.
