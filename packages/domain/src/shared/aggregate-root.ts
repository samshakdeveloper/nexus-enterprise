import type { DomainEvent } from "./domain-event.js";
import { Entity } from "./entity.js";

/**
 * Aggregate Root: the single entry point for mutation within an aggregate
 * boundary; enforces invariants across the whole cluster of entities/VOs it
 * owns, and records domain events raised as a side effect of a valid state
 * transition. Events are collected here and drained by the Unit of Work /
 * repository after a successful commit (never published mid-transaction).
 */
export abstract class AggregateRoot<IdType> extends Entity<IdType> {
  private _domainEvents: DomainEvent[] = [];
  private _version = 0;

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = []; // خالی کردن آرایه
    return events;
  }

  protected constructor(id: IdType) {
    super(id);
  }

  public get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  /** Optimistic-concurrency version, incremented on every state transition. */
  public get version(): number {
    return this._version;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
    this._version += 1;
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
