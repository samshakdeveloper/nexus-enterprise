# ADR-005: Use Awilix as the dependency injection container

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The system follows Clean Architecture with ports and adapters: use cases
depend on interfaces (repositories, event publisher, password hasher,
clock, secret manager), and concrete implementations live in
infrastructure. Something has to create those implementations and connect
them to the code that needs them, without the inner layers knowing which
implementation is used.

## Decision

We use **Awilix** as the dependency injection container, with a single
composition root:

- `initializeCompositionRoot(env)` creates one container at startup and is
  the only place where ports are bound to concrete adapters.
- Registrations are split into modules (`shared`, `infrastructure`,
  `application`, `use-cases`) so each area stays small and readable.
- All registrations are singletons. Components are created once, kept in
  memory, and reused by every request, so there is no per-request
  construction cost.
- The container is typed through `CompositionRootContract`, which lists
  every registration key and its port type. Resolving a wrong key or type
  is caught by the TypeScript compiler.
- The HTTP framework never touches the container directly. It receives
  already-resolved dependencies from the composition root (see ADR-003).
- Tests can build a container with in-memory or fake adapters registered
  under the same keys.

## Consequences

**Positive**

- Domain and application code depend only on ports; swapping an adapter
  (for example Postgres to another store) is a change in one module.
- Wiring is centralized and explicit instead of spread through the code.
- Singletons avoid repeated creation of expensive objects such as the
  database pool.

**Negative / trade-offs**

- Dependencies are resolved at runtime by name, so a missing or misspelled
  registration fails at startup rather than at compile time. The typed
  contract reduces but does not remove this risk.
- Singleton-only means components must be stateless regarding individual
  requests. Request-specific state (such as the current user or correlation
  ID) must be passed explicitly or handled with Awilix scopes
  (`createScope()`) if needed later.
- Awilix's proxy-based injection adds some indirection that can be harder
  to trace than plain constructor calls.

## Alternatives considered

- **Manual wiring (hand-written composition root):** simplest and fully
  type-safe, and viable at small scale, but it grows noisy as modules and
  adapters increase.
- **NestJS DI:** powerful, but couples business code to a framework and
  its decorators, which conflicts with ADR-003.
- **InversifyJS / tsyringe:** rely on decorators and `reflect-metadata`,
  which would spread framework-specific annotations into inner layers.
