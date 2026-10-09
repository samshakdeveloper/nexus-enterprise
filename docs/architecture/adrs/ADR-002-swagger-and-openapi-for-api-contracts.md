# ADR-0001: Generate OpenAPI (Swagger) documentation from Zod schemas

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The API is consumed by more than one client: web frontend, mobile apps, and
potentially other platforms and services. Each of them needs an accurate,
always-current description of every endpoint: paths, methods, request
parameters, request bodies, and response shapes.

Handwritten API documentation (wikis, Markdown files, Postman collections)
drifts from the code as soon as someone forgets to update it. Consumers then
discover the mismatch at runtime, which is the most expensive place to find it.

We already use Zod as the single source of truth for validating requests and
responses at the boundary.

## Decision

We generate the OpenAPI specification and the Swagger UI directly from the
Zod schemas, using `<tool name, e.g. zod-to-openapi>`.

- A schema is written once and is used for runtime validation, TypeScript
  types, and API documentation.
- The OpenAPI document is built at application start and served through
  Swagger UI at `<path, e.g. /docs>`.
- Every new endpoint must register its Zod schemas with the generator.
  No separate hand-written API documentation is maintained.

## Consequences

**Positive**

- Documentation cannot silently diverge from validation: if the schema
  changes, the documentation changes with it.
- Frontend, mobile, and other consumers get an interactive, standard
  OpenAPI contract and can generate typed clients from it.
- No manual documentation step in the pull request process for request and
  response shapes.

**Negative / trade-offs**

- Human-readable explanations (descriptions, examples, error semantics)
  still have to be written by hand inside the schema definitions.
- We depend on a third-party generator and on Zod as the schema language.

## Alternatives considered

- **Handwritten OpenAPI YAML/JSON:** full control, but guaranteed to drift
  and duplicates what Zod already describes.
- **JSDoc `@openapi` comments next to routes:** closer to the code, but
  still a second source of truth that is not checked against validation.
- **Postman collections / wiki pages:** easy to start, but not machine-readable
  as a contract and not versioned with the code.
