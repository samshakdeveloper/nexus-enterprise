import type { DomainEvent } from "@nexus/domain";

/**
 * Outbound port for publishing domain events after a successful commit.
 * Implementations may write to an outbox table (used here) or push
 * directly to a broker; the application layer neither knows nor cares.
 */
export interface EventPublisherPort {
  publish(events: readonly DomainEvent[]): Promise<void>;
}
