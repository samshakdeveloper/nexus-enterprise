// src/ports/event-publisher.port.ts
export interface IEventPublisher {
  publish(topic: string, event: { type: string; payload: Record<string, unknown> }): Promise<void>;
}
