# ADR-013: Use OpenTelemetry for vendor-neutral distributed tracing

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

A single user action crosses several components: the HTTP API, the command
bus, PostgreSQL, the outbox processor, Kafka, and worker services.
Diagnosing latency or failures requires following one request across these
boundaries. Instrumentation should not lock us to a specific monitoring
vendor.

## Decision

We instrument services with **OpenTelemetry** and export data over OTLP:

- The API starts the OpenTelemetry Node SDK before any other module
  (`--import` flag) so auto-instrumentation can patch HTTP, Fastify, and
  database clients. Service name and version are set as resource
  attributes.
- Traces are exported through OTLP/HTTP to Grafana Tempo. The endpoint comes
  from `OTEL_EXPORTER_OTLP_ENDPOINT`, so a different backend can be used
  without code changes.
- Application-level spans are added through decorators/adapters, for
  example `TracedCommandBusAdapter` (one span per command) and the outbox
  processor, rather than inside the domain or application layers.
- The command bus tracing detail is configurable with `TRACING_LEVEL`
  (`easy`, `mid`, `hard`; default `easy`, which adds no command spans) to
  control overhead and the amount of data recorded.
- Grafana is the single place to view traces, logs, and metrics.

## Consequences

**Positive**

- Vendor-neutral: backends can change by configuration, not by rewriting
  instrumentation.
- Auto-instrumentation gives HTTP and database spans with little code, and
  the decorator approach keeps tracing out of business logic.
- Tracing detail can be tuned per environment.

**Negative / trade-offs**

- Tracing is currently active in the API only. The email and event workers
  and the Go worker do not yet run the SDK, so traces do not yet cover the
  full API-to-Kafka-to-worker path.
- Metrics are exported over OTLP to the same endpoint as traces. Tempo only
  accepts traces, so metrics need an OpenTelemetry Collector (or another
  receiver) to be stored; this is not yet in place.
- Auto-instrumentation adds start-up and runtime overhead, and recording
  command payloads at the `hard` level can capture sensitive data.

## Alternatives considered

- **Vendor agents (Datadog, New Relic, and similar):** quick to adopt, but
  tie instrumentation to one vendor.
- **Jaeger client libraries:** now superseded by OpenTelemetry as the
  standard.
- **Logs only with correlation IDs:** simple, but without spans it cannot
  show timing or the structure of a request across services.
