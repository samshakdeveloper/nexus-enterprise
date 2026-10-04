// packages/domain/src/events/contracts/domain-event-envelope.contract.ts

export interface DomainEventEnvelope<T = unknown> {
  eventId: string;
  type: string;
  data: T;
  traceId: string; // اجباری
  occurredAt: string; // اجباری
}
