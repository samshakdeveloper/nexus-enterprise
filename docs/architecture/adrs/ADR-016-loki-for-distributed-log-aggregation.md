# ADR-016: Use Loki for distributed log aggregation

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

Multiple services (API, workers) produce logs, and containers are
short-lived. Logs must be stored centrally, searchable, and connected to
traces and metrics. Full-text indexing of every log line is expensive, and
our logs are already structured JSON.

## Decision

We use **Grafana Loki** for log aggregation:

- Services write structured JSON logs to stdout (see the Pino ADR). Loki
  stores them indexed by labels and compresses the log content, which keeps
  storage and cost low compared with full-text indexing.
- Locally, Loki runs as a single instance with filesystem storage and a
  7-day retention (`monitoring/loki/loki-config.yml`).
- Grafana queries Loki and, through a derived field on `traceId`, links a
  log line to its trace in Tempo.

## Consequences

**Positive**

- Lightweight and cheap to run, and integrated natively with Grafana.
- Logs, metrics, and traces can be navigated from one interface.
- Label-based queries (LogQL) fit structured logs well.

**Negative / trade-offs**

- No log shipping agent is configured in this repository yet (for example
  Promtail or Grafana Alloy), and the application does not push to Loki
  directly. Until one is added, logs written to stdout do not reach Loki.
- The link from logs to traces only works for log lines that contain a
  trace ID; currently only command-bus logs include it.
- The configuration is development-grade (single instance, filesystem
  storage, authentication disabled). Production needs object storage and
  access control.
- Searching by arbitrary text is slower than in a full-text engine.

## Alternatives considered

- **ELK / OpenSearch:** powerful full-text search and analytics, but much
  heavier to operate and store.
- **Cloud logging (CloudWatch, Datadog Logs):** managed, but vendor-bound
  and costly at volume.
- **Plain stdout with `kubectl logs`:** no central search or retention and
  no correlation with traces.