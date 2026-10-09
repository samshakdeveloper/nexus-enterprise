# ADR-015: Use Prometheus and Grafana for infrastructure metrics

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

We need to know whether the system is healthy: request rates, errors,
latency, pod restarts, and Kafka consumer lag. We also want alerting and a
single place to look at metrics, logs, and traces, using open-source tools
that run both locally and on Kubernetes.

## Decision

We use **Prometheus** for metrics and alerting and **Grafana** for
visualization:

- The API exposes HTTP metrics at `/metrics` (via `fastify-metrics`).
  Prometheus pulls them. In Docker Compose, a static scrape configuration
  is used (`monitoring/prometheus/prometheus.yml`); in Kubernetes, a
  `ServiceMonitor` selects the API.
- On Kubernetes, Prometheus and Grafana come from the
  `kube-prometheus-stack` Helm chart, deployed through ArgoCD, with a
  15-day retention.
- Alerts are defined as code in a `PrometheusRule`: API down, pod crash
  looping, deployment replica mismatch, and Kafka consumer lag.
- Grafana datasources (Prometheus, Loki, Tempo) are provisioned from files,
  so the environment is reproducible, and are linked to each other for
  navigation between metrics, logs, and traces.

## Consequences

**Positive**

- Open-source, widely understood tooling that works the same locally and in
  the cluster.
- Alert rules and datasources live in the repository and are versioned.
- Pull-based scraping needs no extra agent in the application.

**Negative / trade-offs**

- Only the API currently exposes metrics; workers do not.
- The Kafka lag alert requires a Kafka exporter that is not part of this
  repository yet.
- No Grafana dashboards are provisioned yet, only datasources.
- Prometheus local storage is not highly available or long-term; larger
  setups need remote storage (for example Thanos or Mimir).

## Alternatives considered

- **Datadog / CloudWatch:** less operational work, but paid, vendor-bound,
  and not reproducible locally.
- **VictoriaMetrics:** efficient and Prometheus-compatible, but adds a
  less standard component for this scale.
- **Pushing metrics through OpenTelemetry only:** possible, but Prometheus
  pull plus ServiceMonitor is the established Kubernetes practice and works
  without a collector.