# 🏛️ Full-Stack Observability & Telemetry Architecture

This document details the telemetry collection matrix, distributed tracing propagation, and runtime monitoring infrastructure implemented within **Nexus Enterprise** .

<p align="center">
  <img src="../assets/01-observability/observability.svg" alt="Observability Grafana Stream" width="750" />
</p>

---

## ⚡ Unified Telemetry Stream (Traces, Metrics, Logs)

The telemetry layer orchestrates the core observability triad: **Traces, Metrics, and Logs** . Data streams out asynchronously from distributed operational runtime nodes into a centralized backend collector engine natively backed by the **OpenTelemetry (OTLP)** protocol and the **Grafana** ecosystem .

---

## 🛠️ Implementation Telemetry Steps & Code Mapping

### Step 1: OpenTelemetry SDK Bootstrap Initialization

The monitoring runtime is driven by an explicit OpenTelemetry NodeSDK instance . It aggregates cross-cutting application attributes, periodically schedules metric exports, and instruments node processes automatically .

```typescript
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
    exportIntervalMillis: 15_000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

- 🔗 **Telemetry Bootstrapper:** [`tracing.ts`](../../apps/api/src/telemetry/tracing.ts)

### Step 2: Aspect-Oriented Interception via Command Bus Decorator

Tracing spans are wrapped and isolated around the primary application bottleneck using a dedicated `TracedCommandBusAdapter` decorator registered dynamically into the IoC container .

```typescript
commandBus: asFunction(({ loggerPort }: CompositionRootContract) => {
  const bus = new InMemoryCommandBus();
  return new TracedCommandBusAdapter(bus, loggerPort, env.TRACING_LEVEL);
}).singleton();
```

- 🔗 **Infrastructure Module Mapping:** [`infrastructure.module.ts`](../../apps/api/src/container/modules/infrastructure.module.ts)

---

## 🚨 Dynamic Infrastructure Overhead Management

To guard server node memory limits and network I/O buffers against high-traffic performance degradation, tracking precision is modulated via the `env.TRACING_LEVEL` environment variable :

- **High-Granularity Auditing:** Escalates runtime execution logging to record exhaustive internal lifecycle hooks for targeted debugging .
- **Low-Overhead Production Baseline:** Compresses logging layers to stream minimal structural envelopes, keeping compute and network consumption optimal under real-world multi-tenant scale .
