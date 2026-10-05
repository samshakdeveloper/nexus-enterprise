import { DomainEventEnvelope, DomainEventTopic } from "@nexus/domain";

export interface MessageBrokerPublisherPort {
  publish<T = unknown>(
    topic: DomainEventTopic,
    key: string,
    envelope: DomainEventEnvelope<T>,
    traceId?: string,
  ): Promise<void>;
}
