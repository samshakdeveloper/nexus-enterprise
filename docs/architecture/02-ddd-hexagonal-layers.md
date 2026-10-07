# 🏛️ Domain-Driven Design & Hexagonal Architecture Layers

This document outlines how architectural boundaries, layer separation, and dependency invariants are programmatically enforced within **Nexus Enterprise** .

<p align="center">
  <img src="../assets/hexagonal-architecture.png" alt="Hexagonal Architecture Topology" width="600" />
</p>

---

## 🎛️ Dependency Injection & IoC Wiring

The runtime application orchestrates and dynamically wires all external infrastructure adapters and application components through an Inversion of Control (IoC) container registry .

* 📂 **Container Directory:** [`apps/api/src/container/`](../../apps/api/src/container/)

For instance, core infrastructural dependencies are encapsulated and registered as singletons using class bindings :

```typescript
userRepositoryPort: asClass(PostgresUserRepositoryAdapter).classic().singleton()
```

* 🔗 **Composition Root:** [`infrastructure.module.ts`](../../apps/api/src/container/modules/infrastructure.module.ts)

---

## 🔄 Strict Port & Adapter Isolation

The application and infrastructure layers operate completely independent of one another, communicating strictly through boundary contracts (Ports) .

If the database engine needs to be migrated from **PostgreSQL** to **MongoDB** (or any other storage driver), the transition requires **zero changes** to the application core layer . Only the underlying infrastructure adapter needs to be swapped out (e.g., mapping `MongodbUserRepositoryAdapter` instead of `PostgresUserRepositoryAdapter` inside the container modules) .

<p align="center">
  <img src="../assets/port-adapter-application.png" alt="Port-Adapter Application Mapping" width="600" />
</p>

<p align="center">
  <img src="../assets/architecture-layers.svg" alt="Clean Architecture Layers" width="600" />
</p>

---

## 🚨 Boundary Verification & Automated Linting

To prevent architectural drift and catch loose dependency leakage during local development, tight boundary constraints are programmatically enforced inside the static code analyzer matrices :

```json
"boundaries/element-types": [
  "error",
  {
    "default": "disallow",
    "rules": [
      { "from": "domain", "allow": ["shared"] },
      { "from": "application", "allow": ["domain", "shared"] },
      { "from": "infrastructure", "allow": ["application", "domain", "shared"] },
      { "from": "shared", "allow": [] },
      { "from": "app", "allow": ["infrastructure", "application", "domain", "shared"] }
    ]
  }
]
```

* 🔗 **ESLint Lint Configuration:** [`eslint.config.js`](../../eslint.config.js)

With these rules implemented, any attempt to break the dependency graph (e.g., importing high-level `infrastructure` modules directly inside a low-level `application` layer service) will trigger an immediate lint error inside the developer's local IDE workspace .

---

## 🛡️ CI/CD Enforcement & Branch Protection Gates

These boundaries do not rely on manual pull request audits . The structural dependency health is checked automatically across the distributed continuous integration lifecycle .

<p align="center">
  <img src="../assets/github-action-pipeline.png" alt="GitHub Actions Pipeline" width="700" />
</p>

During the automation pipeline verification suite, the runner compiles the workspace matrix :

```yaml
run: npm run lint --if-present
```

* 🔗 **GitHub Action Workflow:** [`ci-feature.yml`](../../.github/workflows/ci-feature.yml)

If an invalid dependency import leak occurs, the GitHub Action workflow instantly fails . Strict repository branch protection rules are established to completely block merging pull requests until all validation workflows pass .

<p align="center">
  <img src="../assets/img.png" alt="Branch Protection rule gate 1" width="500" />
  <br />
  <img src="../assets/img_2.png" alt="Branch Protection rule gate 2" width="500" />
  <br />
  <img src="../assets/img_1.png" alt="Branch Protection rule gate 3" width="500" />
</p>

---

*💡 Deep dives concerning testing matrices, mock contexts, and integration coverage guidelines are detailed inside their respective technical runbooks.* 
