# ADR-001: Use Apache Kafka between services

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Nexus is split into several services: the API, `event-worker`, `email-worker` and `pdf-worker`. Some of the work should not happen inside the user's request. Sending an email or generating a PDF can run in the background, and the result can come back later.

We also want the system to keep working when one service is down. If the email service crashes, users should still be able to sign up.

Finally, we may want to write some services in another language, for speed and lower resource use. `pdf-worker` is already written in Go.

## Decision

Services communicate through Apache Kafka. The API does not call the workers directly. It saves events in an outbox table, and `event-worker` publishes them to Kafka (see [CQRS & Event-Driven Architecture](../architecture/03-cqrs-event-driven.md)).

The main topics are:

- `nexus.user` for user events
- `email.notifications.reply` and `email.notifications.dlq`, which the email worker uses for results and failed messages

Locally, Kafka runs as a single broker in Docker Compose. In Kubernetes it runs in KRaft mode, managed by Strimzi.

## Why

- **A failing service does not stop the rest.** If `email-worker` crashes, the API keeps working. The events wait in Kafka, and the worker processes them when it comes back.
- **Background work with a result later.** The caller does not wait. The worker does the job and can send the result back through a reply topic.
- **Any language.** Services only share messages, so a service can be written in whatever language fits. `pdf-worker` is in Go, and the event contracts are defined as Protobuf files in `../../packages/contracts`.
- **It scales with users.** For systems with many users, or that expect to have many later, consumers can be added or scaled independently.

## Consequences

Good:

- Services are decoupled. Each one can be deployed, restarted and scaled on its own.
- Messages stay in Kafka for a configured time, so a consumer that was down can catch up.

Trade-offs:

- Kafka is extra infrastructure to run, monitor and pay for. The Kubernetes setup uses 3 brokers with persistent storage.
- Results are not immediate. The system is eventually consistent, and the UI has to handle that.
- Delivery is at-least-once. If `event-worker` stops after publishing but before marking a row as processed, the same event is sent again. Consumers have to handle duplicates.
- The outbox adds a table and a polling worker, so there is a small delay between saving an event and publishing it.
- Local development is heavier because it needs a broker.

## When not to use this

Kafka is not a good fit for a system with few users, or one used only inside a company. The extra complexity and cost are not worth it. A single application, or a simple job queue in the database, is enough there.

Nexus is a reference implementation of this architecture, so it uses Kafka even though its current load would not need it.

## Other options

- **Direct HTTP calls between services.** The simplest option, but the caller has to wait for the other service and fails when it is down.
- **RabbitMQ or a similar message queue.** Easier to run and good for task queues. Messages are removed once they are handled, so there is no replay.
- **A job queue in the database or Redis.** Works well inside one service and one language. It is harder to share between services written in different languages.
- **No broker.** Everything runs in one process. This is the right choice for small systems.

