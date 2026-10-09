# ADR-024: Use the transactional outbox pattern for atomic message publishing

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

Creating a user must both save data in PostgreSQL and publish an event to
Kafka. These are two systems, so a crash between the two steps would either
lose the event (saved but not published) or publish an event for data that
was rolled back. A distributed transaction is not practical.

## Decision

We use the **transactional outbox pattern**:

- `OutboxEventPublisherAdapter` writes domain events into an `outbox` table
  in the same database transaction as the aggregate (through the unit of
  work), including the trace ID so tracing can continue later.
- A separate relay, the `event-worker`, polls rows where `processed_at` is
  empty, publishes them to Kafka as event envelopes (keyed by aggregate ID),
  and marks them as processed.
- Publishing is decoupled from the request path, so Kafka downtime never
  blocks or fails the API response.
- Delivery is **at-least-once**. Consumers must be idempotent; for example,
  the email worker records each `eventId` in Redis with a TTL before acting.

## Consequences

**Positive**

- The saved data and the event to publish are always consistent.
- The API stays fast and available even when the broker is down.
- Easy to reason about and debug: pending events are visible in a table.

**Negative / trade-offs**

- Events can be published more than once (a crash between publishing and
  marking as processed), so consumers need idempotency.
- The current relay reads batches without ordering and without row locking
  (`FOR UPDATE SKIP LOCKED`), so running several replicas can produce
  duplicates and out-of-order delivery for one aggregate.
- There is no retry limit, backoff, or dead-letter handling for events that
  keep failing.
- Polling adds latency and database load; the `outbox` table needs cleanup
  of processed rows and an index that matches the polling query.
- An unused in-process `OutboxProcessor` still exists in `infrastructure`
  and should be removed to avoid two competing relays.

## Alternatives considered

- **Publish to Kafka directly after the commit:** simplest, but loses events
  on crashes.
- **Distributed transaction / two-phase commit:** consistent in theory, but
  complex and poorly supported across PostgreSQL and Kafka.
- **Change data capture (for example Debezium):** removes polling and gives
  ordering from the database log, but adds significant infrastructure.