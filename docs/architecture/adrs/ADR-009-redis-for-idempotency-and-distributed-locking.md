# ADR-003: Use Redis for idempotency

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Messages between services are delivered at least once (see [ADR-001](ADR-001-kafka-broker.md)). The same event can arrive twice, for example when `event-worker` stops after publishing but before marking the outbox row, or when a consumer restarts before it commits its offset. For the email worker, a duplicate means a user gets the same email twice.

API clients also retry. If a request times out and the client sends it again, the second request should not run the same action a second time.

Both cases need a place to ask "have I seen this key before?". The answer has to be fast and shared by every instance of a service, and old keys should disappear on their own.

## Decision

We use Redis as a small store for short-lived idempotency keys. It is used for nothing else: no caching and no sessions.

**1. Email worker (in use).** Before sending an email, the worker runs `SET processed_event:<eventId> 1 EX 86400 NX`.

- If the key already exists, the event was handled before. The worker skips it and commits the offset.
- If the key was created, the worker sends the email.
- If sending fails, the worker deletes the key so the event can be tried again, and publishes an `EMAIL_FAILED` event.

The code is in `apps/email-worker/src/handlers/email-worker.handler.ts`.

**2. API (prepared, not connected yet).** The idempotency plugin looks at the `Idempotency-Key` header on `POST`, `PUT`, `PATCH` and `DELETE` requests.

- While a request runs, the key is marked as `processing` for 60 seconds. A second request with the same key gets `409`.
- After a successful response, the response is stored for 24 hours. A repeated request gets the stored response with the header `x-idempotent-replay: true`.
- A `5xx` response removes the key, so the client can retry.

The plugin can use Redis, but the API registers it without a Redis client. Today it falls back to an in-memory map. The code is in `apps/api/src/presentation/fastify/middlewares/idempotency.plugin.ts`.

**Where Redis runs.** In Docker Compose it is the `redis:7-alpine` image. In the dev Kubernetes overlay it is a single pod without persistence, reached at `redis-service:6379`, and only the email worker may connect to it. The production overlay does not define Redis yet.

## Why

- **Check and write in one step.** `SET ... NX` creates the key only if it does not exist. Two workers cannot both believe they are first.
- **Keys expire on their own.** `EX` removes old keys, so no cleanup job is needed.
- **Shared between instances.** Every replica of a worker or of the API sees the same keys. An in-memory map only works for one process.
- **Light.** There is no schema or migration, and no extra load on the main database.

## Consequences

Good:

- A duplicate event does not send a second email.
- It is a small addition: one `SET` call in the worker.

Trade-offs:

- Redis is one more thing to run. The email worker cannot process messages while Redis is unreachable.
- The key is set before the email is sent. If the worker stops between those two steps, the event is delivered again, found as already processed, and skipped. The email is never sent. Storing a short `processing` state first, like the API plugin does, would close this gap.
- Keys expire after 24 hours. A duplicate that arrives later is processed again.
- The dev Redis has no persistence. If it restarts, the keys are lost and duplicates become possible again.
- The API does not use Redis yet. With several API replicas, or after a restart, a retry that reaches a different instance is not detected. To fix it, pass a Redis client when registering the plugin and add `REDIS_URL` to the API configuration.
- The production overlay has no Redis and no `REDIS_URL`. The email worker would try `localhost:6379`.
- The email worker uses the `ioredis` client directly, not through a port. Its unit tests use a mock.

## When not to use this

Do not add Redis if a service runs as a single instance and duplicates are harmless, or if you already have a database where a unique constraint can do the same job. For a small system, that is simpler.

Redis here is not a source of truth. Do not store data in it that you cannot afford to lose.

## Other options

- **A table in PostgreSQL with a unique event id.** No new component, and the data is durable. It needs a table and a cleanup job, and adds load to the main database.
- **An in-memory map.** Needs nothing, but works for one process only and is lost on restart. This is the API's current fallback.
- **Making the action idempotent by itself**, for example with a unique constraint on the data it writes. This is the best option when it is possible, but sending an email has no such constraint.
- **Kafka transactions.** They give exactly-once processing between Kafka topics, but they do not cover the call to the mail server.
