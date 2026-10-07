# 🏛️ Enterprise Workspace Topology & Directory Structure

This document outlines the structural design, module boundaries, and dependency flow of the **Nexus Enterprise** monorepo. The repository layout leverages **Turborepo** and **npm workspaces** to enforce a strict separation of concerns, maximizing code reusability while eliminating circular dependencies across microservices.

---

## 🧭 Monorepo High-Level Layout

The workspace is split into two primary operational directories:

- `apps/`: Deployable, runtime applications (microservices, gateways, frontends). Each app is isolated and compiled independently.
- `packages/`: Shared libraries, internal tooling, and core infrastructure modules published internally to the workspace.

---

## 📦 Directory Blueprint & Architectural Mapping

### 1. The `apps/` Layer (Runtime & Delivery)

Every subdirectory within `apps/` represents an autonomous runtime boundary. These services contain zero core business logic; they act as _Adapters_ in the Hexagonal paradigm, exposing ports via network protocols.

- `apps/api-gateway/`: Built on **Fastify** and **GraphQL Mesh**. Serves as the single edge-entry point, handling authentication parsing, rate-limiting, and orchestrating distributed microservice queries.
- `apps/*-service/`: Context-specific microservices (e.g., `identity-service`, `order-service`). They consume packages from the workspace and expose high-performance HTTP/gRPC endpoints.
- `apps/worker-ecosystem/`: Background consumer routines dedicated to pulling entries from **Apache Kafka** transaction logs and executing delayed outbox patterns.

### 2. The `packages/` Layer (Core Assets & Cross-Cutting Concerns)

Packages are subdivided into **Domain Packages** (business-centric, zero external dependencies) and **Infrastructure Packages** (technical capabilities).

#### 🧬 Domain & Core Logic Packages

- `packages/domain-core/`: The absolute heart of the ecosystem. Contains aggregate roots, value objects, domain events, and core exceptions. Completely framework-agnostic.
- `packages/cqrs-engine/`: The unified bus interface mapping Commands/Queries to their respective asynchronous or synchronous handlers.

#### 🛠️ Infrastructure & Utility Packages

- `packages/infra-kafka/`: Wraps production-ready Kafka client configs, implementing resilient retry-topics, dead-letter queues (DLQ), and idempotent consumer setups.
- `packages/infra-redis/`: Distributed locking mechanism, caching decorators, and atomic sequence generation.
- `packages/observability/`: Global configuration for **OpenTelemetry**, distributing trace propagation tokens (`traceparent`) across HTTP headers and Kafka metadata.
- `packages/database-client/`: High-performance pooling layers, migration runners, and the execution engine for the **Transactional Outbox Pattern**.

#### ⚙️ Configuration & Tooling Packages

- `packages/typescript-config/`: Strict, unified base `tsconfig.json` extended by all apps and internal modules.
- `packages/eslint-config/`: Production-grade linting matrices ensuring uniform formatting rules alongside Prettier.

---

## 🔄 Strict Dependency Flow Rules

To maintain long-term testability and prevent tight coupling, dependency instantiation follows a strict **one-way downward flow**:

1.  **Framework Independence:** `packages/domain-core` must **never** import from any other internal package or external HTTP/Database library. It defines the _Ports_ (interfaces).
2.  **Inversion of Control (IoC):** Infrastructure packages implement those Ports.
3.  **Application Orchestration:** Runtime `apps/` import both Domain and Infrastructure layers, injecting concrete implementations into structural ports at runtime initialization.

---

## ⚡ Turborepo Task Pipelines (`turbo.json`)

Task dependencies are declared globally at the root to enable parallel compilation and deep DAG (Directed Acyclic Graph) caching:

```json
{
  "$schema": "https://turbo.build",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- `^build`: Ensures a package's internal workspace dependencies are fully compiled before the package itself begins its compilation pipeline.
