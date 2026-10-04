import { DomainEventEnvelope } from "../../events/domain-event-envelope.contract.js";
import { DomainEventTopic } from "../../events/domain-event-topics.js";

export interface MessageBrokerPublisherPort {
  publish<T = unknown>(
    topic: DomainEventTopic,
    key: string,
    envelope: DomainEventEnvelope<T>,
    traceId?: string,
  ): Promise<void>;
}
