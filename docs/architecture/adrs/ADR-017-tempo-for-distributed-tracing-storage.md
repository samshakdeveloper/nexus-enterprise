# ADR-017: Use Grafana Tempo for distributed trace storage

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

Services emit OpenTelemetry traces (see the OpenTelemetry ADR). We need a
backend that stores them, accepts the standard OTLP protocol, is cheap to
run, and integrates with the rest of our observability stack.

## Decision

We use **Grafana Tempo** as the trace backend:

- Tempo receives traces over OTLP (HTTP on 4318 and gRPC on 4317), so
  applications export directly without a vendor-specific protocol.
- Traces are stored on a local backend with a 7-day block retention in the
  default configuration (`monitoring/tempo/tempo.yaml`).
- Grafana queries Tempo and links traces back to logs in Loki
  (`tracesToLogs`).

## Consequences

**Positive**

- Index-light design (lookup by trace ID, plus TraceQL search) keeps
  storage cheap and can use object storage in production.
- Standard OTLP ingestion and native Grafana integration.
- Fully open-source and runnable locally.

**Negative / trade-offs**

- The current configuration is development-grade: local disk storage, no
  replication.
- The service map in Grafana is linked to Prometheus, but Tempo's
  metrics-generator is not enabled, so service maps and span-derived
  metrics are not available yet.
- Only the API sends traces today, so end-to-end traces across workers are
  incomplete.
- Tempo only accepts traces; metrics sent to the same OTLP endpoint are not
  stored.

## Alternatives considered

- **Jaeger:** mature UI and storage options, but needs heavier storage such
  as Elasticsearch or Cassandra for production and integrates less tightly
  with Grafana.
- **Zipkin:** simple, but less capable and less actively developed.
- **Vendor APM (Datadog, New Relic):** convenient, but vendor-bound and not
  reproducible locally.