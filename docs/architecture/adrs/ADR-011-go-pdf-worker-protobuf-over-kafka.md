# ADR-009: Implement the PDF worker in Go, communicating through Protobuf over Kafka

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

PDF generation is a CPU- and memory-oriented workload that should not run
inside the API process or compete with request handling. It is also a good
case to show that the event-driven architecture is not tied to one
language: any service that can speak Kafka and the shared message contract
can join the system.

A language with low runtime overhead, fast startup, and small container
images is attractive for a worker like this.

## Decision

The PDF worker (`apps/pdf-worker`) is a separate microservice written in
**Go**:

- It consumes `GeneratePdfCommand` messages from the Kafka topic
  `nexus.pdf.generate` using a consumer group.
- Messages are serialized with **Protobuf**. The contract lives in
  `packages/contracts/pdf_events.proto` and the Go types are generated
  from it at build time, so producers and consumers share one definition.
- It generates the PDF and uploads it to S3-compatible storage (MinIO),
  then publishes a result event containing a presigned URL instead of the
  file itself (claim-check pattern), which keeps Kafka messages small.
- Internally it follows the same ports-and-adapters structure as the rest
  of the system: a use case depends on `PDFGeneratorPort` and `StoragePort`,
  and adapters implement them (gofpdf, MinIO, Kafka).
- gRPC is not used. Communication is asynchronous through Kafka only.

## Consequences

**Positive**

- The heavy work is isolated from the API and can be scaled and deployed
  independently.
- Go gives low memory use, fast startup, and small static binaries, which
  suits a worker that scales horizontally.
- A typed, shared contract replaces ad hoc JSON between services written in
  different languages.
- Demonstrates that the Kafka-based design is language-agnostic.

**Negative / trade-offs**

- A second toolchain (Go, protoc, its own tests and Dockerfile) adds CI and
  maintenance cost compared with another Node.js worker.
- The performance benefit has not been measured in this repository. The
  current generator is a minimal implementation, so the language choice is
  justified by isolation and operational profile rather than benchmarks.
- Failed messages are logged and not retried through a dead-letter topic;
  this is a known gap.

## Alternatives considered

- **Node.js worker (same stack as the API):** simplest and shares code, but
  gives no isolation from the JavaScript runtime and weaker fit for
  CPU-bound work.
- **Node.js with `worker_threads`:** keeps one language, but still ties the
  work to the API runtime and its deployment.
- **Synchronous gRPC service:** gives immediate responses, but couples the
  caller to the worker's availability and loses the buffering and replay
  provided by Kafka (see ADR-001).