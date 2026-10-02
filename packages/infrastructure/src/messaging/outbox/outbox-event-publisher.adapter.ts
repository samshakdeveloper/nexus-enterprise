import type { EventPublisherPort } from "@nexus/application";
import type { DomainEvent } from "@nexus/domain";
import type { Kysely } from "kysely";
import { v7 as uuidv7 } from "uuid";

import type { PostgresTablesContract } from "../../persistence/postgres/postgres-tables.contract.js";

/**
 * Transactional-outbox implementation of EventPublisher: writes events to
 * the `outbox` table as part of the SAME transaction as the aggregate
 * write (see PostgresUnitOfWork), guaranteeing "the user was saved" and
 * "the event will eventually be published" are never out of sync. A
 * separate OutboxProcessor polls/streams unprocessed rows to the message
 * broker (Kafka/SQS/NATS in production) — decoupled from the request path
 * so publishing latency/broker downtime never blocks the API response.
 */
export class OutboxEventPublisherAdapter implements EventPublisherPort {
  constructor(private readonly db: Kysely<PostgresTablesContract>) {}

  public async publish(events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.db
      .insertInto("outbox")
      .values(
        events.map((event) => ({
          id: uuidv7(),
          aggregate_id: event.aggregateId,
          event_name: event.eventName,
          payload: JSON.stringify(event.payload),
          trace_id: event.traceId ?? null,
          occurred_at: event.occurredAt,
          processed_at: null,
        })),
      )
      .execute();
  }
}
