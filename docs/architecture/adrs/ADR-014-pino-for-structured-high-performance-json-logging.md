# ADR-014: Use Pino for structured, high-performance JSON logging

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

Logs must be machine-readable so they can be collected, filtered, and
correlated with traces in the monitoring stack (Loki and Grafana). Logging
sits on the hot path of every request, so it should add little overhead.
Business code should also not depend on a specific logging library.

## Decision

We use **Pino** behind a logger port:

- `LoggerPort` (in the shared package) defines the logging contract used by
  application and domain-adjacent code.
- `PinoLoggerAdapter` implements it in infrastructure. It is the only place
  where Pino is used directly for application logs, and it is bound in the
  composition root.
- Logs are written as structured JSON to stdout. We do not use `pino-pretty`
  in the application, so the output format is the same in every
  environment; collection and shipping to Loki are handled by the platform
  rather than by the application process.
- Contextual data is passed as structured fields (for example `traceId` and
  `durationMs`), and `child()` loggers carry bindings across a flow.

## Consequences

**Positive**

- Fast, low-overhead logging that does not slow request handling.
- JSON output is directly ingestible by Loki and can be joined with traces
  through trace identifiers.
- Replacing the logging library only requires a new adapter.

**Negative / trade-offs**

- JSON logs are harder to read locally without a formatter.
- Fastify currently creates its own Pino instance for request logging,
  separate from `PinoLoggerAdapter`; the two should be unified.
- Log redaction (for example for authorization headers or passwords) is not
  configured yet and must be added before logging request data in
  production.
- The `pino-loki` dependency and `LOKI_URL` setting are present but not
  used for shipping logs, and should be removed or adopted.

## Alternatives considered

- **Winston:** popular and flexible, but slower and heavier per log call.
- **Bunyan:** similar structured approach, but less actively maintained.
- **`console.log`:** no levels, structure, or context binding.