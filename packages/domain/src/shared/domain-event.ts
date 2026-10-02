/**
 * A fact that has happened in the domain. Domain events are immutable,
 * named in the past tense, and carry only the data needed by subscribers —
 * never a reference to the aggregate itself (avoids coupling + staleness).
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  /** W3C trace-context id of the operation that produced this event, for end-to-end tracing across the outbox/broker boundary. */
  readonly traceId?: string | undefined;
  readonly payload: Record<string, unknown>;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;

  protected constructor(
    public readonly eventName: string,
    public readonly aggregateId: string,
    public readonly payload: Record<string, unknown>,
    idGenerator: { generate(): string },
    clock: { now(): Date },
    public readonly traceId?: string | undefined,
  ) {
    this.eventId = idGenerator.generate();
    this.occurredAt = clock.now();
  }
}
