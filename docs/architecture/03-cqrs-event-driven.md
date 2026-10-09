# CQRS & Asynchronous Event-Driven Architecture

This document describes the event-driven design, the lifecycle of a message, and the transactional outbox pattern used in **Nexus Enterprise** to keep services eventually consistent.

<p align="center">
  <img src="../assets/03/event-driven-kafka.svg" alt="Event-Driven Apache Kafka Pipeline" width="750" />
</p>

---

## Asynchronous Design

To decouple services and make the system more resilient, the side effects of commands are handled with the **Transactional Outbox** pattern and **Apache Kafka**.

### Crash Resilience and Eventual Consistency

If a downstream consumer (for example the email worker) crashes, the rest of the system keeps working. The state change is already saved in the outbox. When the consumer comes back, it resubscribes and continues from its last committed offset, and the pending jobs are processed without losing any messages.

---

## Message Lifecycle

### Step 1: Writing to the outbox

The domain events of the aggregate are pulled and saved to the outbox in the same database transaction as the main change.

```typescript
await this.deps.eventPublisherPort.publish(userAggregate.pullDomainEvents());
```

- **Command handler:** [`create-user.handler.ts`](../../packages/application/src/users/commands/create-user/create-user.handler.ts)

### Step 2: Fetching unprocessed rows

The event worker polls the outbox for rows that have not been processed yet (`processed_at IS NULL`), up to a batch size.

```typescript
async fetchPendingMessages(batchSize: number): Promise<OutboxMessage[]> {
  const query = sql<OutboxMessage>`
    SELECT id,
           aggregate_id AS "aggregateId",
           event_name AS "type",
           payload,
           trace_id AS "traceId"
    FROM outbox
    WHERE processed_at IS NULL
    LIMIT ${batchSize}
  `;
  // execution...
}
```

- **Outbox adapter:** [`outbox-repository.adapter.ts`](../../apps/event-worker/src/adapters/outbox-repository.adapter.ts)

### Step 3: Publishing to Kafka

For each pending row, the worker wraps the payload in an event envelope, publishes it to the Kafka topic, and then marks the row as processed.

```typescript
const pendingMessages = await this.outboxRepo.fetchPendingMessages(50);

for (const message of pendingMessages) {
  try {
    const topic = DomainEventTopics.USER_EVENTS;
    const eventEnvelope: DomainEventEnvelope = {
      eventId: message.id,
      type: message.type,
      data: message.payload,
      traceId: message.traceId ?? crypto.randomUUID(),
    };
    await this.messageBrokerPublisher.publish(topic, message.aggregateId, eventEnvelope, message.traceId);
    await this.outboxRepo.markAsProcessed(message.id);
  } catch (error) {
    // Operational failure tracking...
  }
}
```

### Step 4: Subscribing to the topic

Consumers such as `email-worker` subscribe to the Kafka topic directly, without depending on the other services.

```typescript
await consumer.subscribe({ topic: DomainEventTopics.USER_EVENTS, fromBeginning: false });
```

- **Consumer entrypoint:** [`email-worker.ts`](../../apps/email-worker/src/email-worker.ts)

### Step 5: Handling the message

Each message is passed to the worker's handler. Auto-commit is turned off, so the handler decides when a message is acknowledged.

```typescript
await consumer.run({
  autoCommit: false,
  eachMessage: (payload) => workerHandler.handleMessage(payload),
});
```

- **Consumer handler:** [`email-worker.handler.ts`](../../apps/email-worker/src/handlers/email-worker.handler.ts)
