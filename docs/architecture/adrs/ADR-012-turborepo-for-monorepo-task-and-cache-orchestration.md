# ADR-012: Use Turborepo for monorepo task and cache orchestration

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The repository contains several applications (`api`, `email-worker`,
`event-worker`, `pdf-worker`, `web`) and shared packages (`domain`,
`application`, `infrastructure`, `shared`, `contracts`). Packages depend on
each other, so builds must run in dependency order, and rebuilding or
retesting unchanged code on every run wastes time locally and in CI.

## Decision

We use **npm workspaces** for package linking and **Turborepo** for task
orchestration:

- `turbo.json` defines the task graph. `build` depends on the `build` of its
  dependencies (`^build`) and declares its outputs (`dist/**`, `.next/**`),
  so results can be cached and restored.
- `lint`, `lint:check`, and `test` run per package through
  `turbo run <task>`; `dev` is persistent and uncached.
- `docker:build` depends on `build` and is not cached.
- Root scripts expose these tasks (`npm run build`, `npm test`, filtering
  with `--filter`, for example `dev:api`).
- CI persists the `.turbo` cache directory between runs.

## Consequences

**Positive**

- Packages build in the correct order and only changed packages are
  rebuilt, which shortens local and CI runs.
- One command from the root runs the same tasks across all workspaces.
- Low configuration cost compared with larger monorepo build systems.

**Negative / trade-offs**

- The cache is local to each machine and CI cache entry. A shared remote
  cache is not configured, so cache hits across developers and runners are
  limited.
- Cache correctness depends on accurate `inputs` and `outputs` in
  `turbo.json`; a mistake there produces stale or missing results.
- Non-JavaScript services (the Go worker) take part in the task graph only
  through wrapper scripts, not through native Go tooling.

## Alternatives considered

- **Nx:** more features (generators, project graph tooling), but heavier
  configuration than this repository needs.
- **Plain npm workspaces with scripts:** no dependency-aware ordering or
  caching.
- **Separate repositories per service:** clearer ownership boundaries, but
  harder to change shared contracts and packages atomically.
