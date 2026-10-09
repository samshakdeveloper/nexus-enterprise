# ADR-020: Use Argo CD for declarative GitOps continuous delivery

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

Deployments should be reproducible, auditable, and reversible. Applying
manifests by hand with `kubectl` leaves no review trail and lets the
cluster drift from what is in the repository.

## Decision

We use **Argo CD** with a GitOps model: Git is the source of truth and the
cluster is continuously reconciled to it.

- Argo CD `Application` resources live in `platform/argocd/apps`.
  Currently they deploy the observability stack from Helm charts:
  `kube-prometheus-stack`, `loki`, and `tempo`.
- Applications use automated sync with `prune` and `selfHeal`, so manual
  changes in the cluster are reverted, and `CreateNamespace` for the target
  namespace.
- Chart versions are pinned through `targetRevision`.
- The application workloads are organized as a Kustomize overlay
  (`k8s/overlays/prod`, see ADR-019) so that an Argo CD `Application` can
  point at it directly.

## Consequences

**Positive**

- Every cluster change goes through Git, giving review, history, and
  easy rollback.
- Drift is detected and corrected automatically.
- Platform components are versioned and deployed the same way as
  everything else.

**Negative / trade-offs**

- An `Application` for the Nexus services themselves (`k8s/overlays/prod`)
  is not defined yet, so application delivery is not GitOps-managed.
- CI does not yet build or publish images or update image digests in the
  overlay, so the delivery pipeline is not closed end to end.
- Some secrets still sit in Application manifests (for example the Grafana
  admin password) and must move to ExternalSecrets before production.
- Chart versions carry TODOs to confirm the latest stable release.
- Automated pruning and self-heal are strict and require care when
  experimenting directly in the cluster.

## Alternatives considered

- **Flux:** also a solid GitOps tool; Argo CD was chosen for its UI and
  application view.
- **CI-driven `kubectl apply` or Helm from the pipeline:** simple, but gives
  no continuous reconciliation or drift detection and puts cluster
  credentials in CI.
- **Manual deployments:** no audit trail and prone to drift.