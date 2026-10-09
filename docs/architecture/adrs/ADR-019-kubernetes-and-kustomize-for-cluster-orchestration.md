# ADR-019: Use Kubernetes and Kustomize for cluster orchestration

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

The system consists of several services plus stateful dependencies
(PostgreSQL and Kafka). We need scaling, self-healing, rolling updates,
network isolation, and consistent configuration across environments
(development and production) without duplicating manifests.

## Decision

We deploy to **Kubernetes** and organize manifests with **Kustomize**:

- `k8s/base` contains the environment-independent resources: workloads
  (api, web, workers), routes, network policies, and alert rules. No
  namespace is hardcoded there.
- `k8s/overlays/dev` and `k8s/overlays/prod` set the namespace, generate
  the shared ConfigMap, select image names or digests, and patch replicas
  and update strategy. Plain Kustomize patches are used instead of
  templating.
- Workloads are hardened and sized: `runAsNonRoot`,
  `readOnlyRootFilesystem`, resource requests and limits, readiness and
  liveness probes, a HorizontalPodAutoscaler, and a PodDisruptionBudget.
- Traffic is restricted with NetworkPolicies, and ingress is defined with
  Gateway API resources.
- Stateful dependencies are managed by operators through custom resources:
  a PostgreSQL `Cluster` and Kafka (`Kafka`, `KafkaNodePool`).
- Secrets: development uses generated, clearly fake values; production uses
  ExternalSecrets so no real secrets are stored in Git.

## Consequences

**Positive**

- Horizontal scaling, rolling updates, and self-healing out of the box.
- One base with small overlays keeps environments consistent and
  reviewable, with no template logic to debug.
- Security defaults (non-root, read-only filesystem, network policies) are
  declared in code.

**Negative / trade-offs**

- The cluster must have the required operators and CRDs installed
  (PostgreSQL operator, Kafka operator, Gateway API, External Secrets).
- Production overlay values are still placeholders (image digests, domain
  names, object storage endpoint) and must be filled before real use.
- Kustomize has limited logic compared with Helm, so complex
  parameterization is harder.
- Observability resources currently exist both in `k8s/base` and in the
  Helm-based monitoring stack; one source should be chosen.

## Alternatives considered

- **Helm charts for our own services:** powerful templating, but harder to
  read and review for a small set of services.
- **Plain manifests per environment:** no tooling needed, but duplicates
  everything and drifts.
- **Docker Compose only:** fine for local development, but no scaling,
  self-healing, or network policy model.