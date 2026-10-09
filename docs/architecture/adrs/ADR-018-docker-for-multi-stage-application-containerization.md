# ADR-018: Use Docker multi-stage builds for application containerization

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

Each deployable (API, web, email worker, event worker, PDF worker) must run
the same way on a developer machine, in CI, and in Kubernetes. Runtime
images should be small and should not contain compilers, development
dependencies, or source code that is not needed to run the service.

## Decision

Every deployable has its own `Dockerfile` using **multi-stage builds**:

- A **builder** stage has the full toolchain and development dependencies,
  installs dependencies with `npm ci`, and compiles the service
  (TypeScript with `tsup`, Next.js build, or `go build`).
- A **runner** stage starts from a minimal Alpine base and copies only the
  build output and production dependencies (`npm prune --production`).
- Node services set `NODE_ENV=production` and run as a dedicated non-root
  user. The API loads OpenTelemetry before the application with
  `--import ./dist/telemetry/tracing.js`.
- The Go worker builds a static binary (`CGO_ENABLED=0`) and compiles its
  Protobuf contract from `packages/contracts` during the build, with
  BuildKit cache mounts for Go modules and the build cache.
- A root `.dockerignore` excludes `node_modules`, build output, `.git`, and
  caches from the build context.

## Consequences

**Positive**

- Small runtime images with a reduced attack surface and faster pulls and
  start-up.
- The same image runs in every environment; configuration comes from the
  environment.
- Build tooling and dev dependencies never reach production.

**Negative / trade-offs**

- The PDF worker image does not yet set a non-root user, and its runtime
  base image uses the unpinned `alpine:latest` tag. Base images should be
  pinned by version or digest.
- No image vulnerability scanning or SBOM generation exists in CI yet, and
  CI does not build or publish images.
- Images define no `HEALTHCHECK`; health is handled by Kubernetes probes.
- The build context is the monorepo root, so changes to shared packages
  invalidate caches for several images.

## Alternatives considered

- **Single-stage images:** simpler, but ship compilers, dev dependencies,
  and source code to production.
- **Distroless base images:** smaller and more locked down, but harder to
  debug and a less familiar workflow.
- **Buildpacks or `ko`:** less Dockerfile maintenance, but less control
  over the monorepo layout and build steps.