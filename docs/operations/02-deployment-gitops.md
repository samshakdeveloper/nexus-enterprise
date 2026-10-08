# Kubernetes Deployment & GitOps

This document explains how Nexus runs on Kubernetes, how the manifests are organized, how to deploy to a dev cluster, and what production adds on top. The last section lists what is not finished yet.

## Layout

```
k8s/
  base/            manifests shared by all environments
  overlays/
    dev/           dev cluster: namespace, gateway, MinIO, Mailpit, Redis, generated dev secrets
    prod/          production: namespace with quotas, gateway, ExternalSecrets, Postgres backups, image digests
  optional/        examples that are not deployed by default (KEDA scaling, Kafka topics)
platform/
  argocd/apps/     Argo CD Applications for monitoring (kube-prometheus-stack, Loki, Tempo)
scripts/
  k8s-deploy.ts    deploy script used by `npm run k8s:up`
```

The manifests are built with Kustomize. `base` has no namespace and no environment-specific values. Each overlay sets the namespace and generates the `global-env-config` ConfigMap from its own `config/app.env`. Secrets are also created per overlay: the dev overlay generates placeholder values, and the prod overlay reads them from Vault.

## What runs in the cluster

| Component       | How it runs                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------- |
| `api`           | Deployment with 2 replicas and an autoscaler (2 to 10 replicas at 70% CPU), plus a Service and a PodDisruptionBudget |
| `web`           | Deployment with 2 replicas, plus a Service                                                   |
| `event-worker`, `email-worker`, `pdf-worker` | Deployments with 2 replicas each                                 |
| PostgreSQL      | [CloudNativePG](https://cloudnative-pg.io) cluster `nexus-pg` with 3 instances. Apps connect to the `nexus-pg-rw` service |
| Kafka           | [Strimzi](https://strimzi.io) cluster `nexus-kafka` in KRaft mode with 3 nodes. Bootstrap address: `nexus-kafka-kafka-bootstrap:9092` |
| Traffic         | Gateway API with Envoy Gateway and HTTPS through cert-manager. `/api` goes to the API and everything else goes to `web`. HTTP is redirected to HTTPS |
| Monitoring      | Prometheus, Alertmanager, Grafana, Loki and Tempo, installed by Argo CD in the `monitoring` namespace |

The API rolls out without taking pods down (`maxUnavailable: 0`), and has startup, readiness and liveness probes on `/health/live` and `/health/ready`. The API and workers run as a non-root user with a read-only root filesystem and all Linux capabilities dropped. The event worker gets 60 seconds to shut down so it can finish its current batch.

### Network policies

All application pods start with ingress and egress denied. Each allowed connection is added explicitly:

- DNS lookups
- Ingress from the gateway to pods labeled `nexus.io/expose: http`
- Prometheus scraping the API
- `web` to `api`
- Apps to Postgres (5432) and Kafka (9092)
- Traces and logs to the `monitoring` namespace
- Outbound S3 (443) and SMTP only for pods labeled `nexus.io/egress: s3` or `smtp`

### Monitoring and alerts

The Argo CD Applications in `platform/argocd/apps/` install kube-prometheus-stack, Loki and Tempo with automated sync, pruning and self-healing. Grafana is provisioned with Loki and Tempo as data sources, and log lines link to their traces.

`k8s/base/observability-rules.yaml` adds a ServiceMonitor that scrapes the API's `/metrics` every 30 seconds, and alerts for: no healthy API instance, crash-looping pods, deployments with fewer replicas than wanted, and high Kafka consumer lag. Postgres metrics come from a PodMonitor in `postgres-cluster.yaml`.

## Cluster prerequisites

The repository does not install these. They need to be in the cluster before you deploy:

- Argo CD, in the `argocd` namespace
- CloudNativePG operator
- Strimzi operator
- Gateway API CRDs and Envoy Gateway (the gateway uses the class `eg`)
- cert-manager, with the `letsencrypt-staging` (dev) or `letsencrypt-prod` (prod) ClusterIssuer
- For production only: External Secrets Operator with a ClusterSecretStore named `vault`, and the Barman Cloud plugin for CloudNativePG
- Optional: KEDA, if you use `k8s/optional/keda-workers.yaml`

## Deploying to a dev cluster

The dev overlay uses locally built images (`nexus-api:latest` and so on) with `imagePullPolicy: IfNotPresent`, so it expects a cluster that can see your local Docker images, such as the Kubernetes in Docker Desktop. It runs one replica of everything and shrinks the Postgres and Kafka clusters to a single node.

You need a `.env` file in the repository root. Then:

```bash
npm run k8s:up
```

The script (`scripts/k8s-deploy.ts`) does four things:

1. Builds all Docker images in parallel with Turborepo (`docker:build`).
2. Applies the monitoring Applications from `platform/argocd/apps/` to Argo CD.
3. Waits up to 5 minutes for the required CRDs (Prometheus Operator, CloudNativePG, Strimzi, Gateway API). If an operator is missing, it fails and tells you which one.
4. Renders `k8s/overlays/dev` with Kustomize, replaces `${NAME}` placeholders with values from `.env`, deletes the old `minio-create-bucket` Job (a Job's template cannot be changed in place), and applies everything.

Useful commands:

| Command                          | What it does                                              |
| -------------------------------- | --------------------------------------------------------- |
| `npm run k8s:status`             | Show pods, services, routes, the Postgres cluster and Kafka |
| `npm run k8s:redeploy`           | Rebuild images, apply the manifests, restart all deployments |
| `npm run k8s:restart:all`        | Restart all deployments                                   |
| `npm run k8s:clean:pods`         | Delete the Nexus pods so they are recreated               |
| `npm run k8s:down`               | Delete everything from the dev overlay                    |

`k8s:down` only removes the Nexus resources. The monitoring Applications and the operators stay installed.

To look at the final manifests of an environment without applying them:

```bash
kubectl kustomize k8s/overlays/dev
kubectl kustomize k8s/overlays/prod
```

The values in the dev secrets are placeholders that are committed on purpose. Never reuse them anywhere else.

## Production

The prod overlay changes these things:

- **Namespace.** `nexus-prod` enforces the `restricted` Pod Security level and has a ResourceQuota and default container limits.
- **Secrets.** Nothing secret is in Git. External Secrets reads them from Vault every hour: `nexus/prod/postgres`, `app`, `s3`, `pg-backup-s3` and `smtp`.
- **Images.** They come from a registry and are pinned by digest. The digests in the overlay are placeholders (`sha256:REPLACE_ME`) that have to be filled in at release time.
- **Scale.** `api`, `web` and `pdf-worker` run 3 replicas. Postgres keeps its 3 instances and Kafka its 3 nodes with replication factor 3 and `min.insync.replicas: 2`.
- **Backups.** Postgres archives WAL and takes a full backup every night at 02:00, with 30 days of retention, through the Barman Cloud plugin to an S3 bucket.
- **Config.** Swagger UI is off and tracing is at the `easy` level.

## Status

Not finished yet:

- Argo CD only manages the monitoring stack. There is no Argo CD Application for Nexus itself, so the app is deployed with the script (dev) and not pulled from Git. The Application manifests are also applied with `kubectl`, not by Argo CD.
- There is no workflow that deploys to a cluster, and the prod image digests are not filled in automatically.
- Some prod values are placeholders marked `TODO`: the gateway hostname, the backup bucket and its endpoint, and the registry address.
- The Kafka listener has no TLS or authentication and is only protected by network policies. Topics are created automatically; `k8s/optional/kafka-topics.yaml` shows how to define them explicitly.
- The workers have no liveness probe, because they do not expose a health endpoint yet.