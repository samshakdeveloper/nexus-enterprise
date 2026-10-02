// packages/application/src/ports/outbox-repository.port.ts
export interface OutboxMessage {
  id: string;
  aggregateType: string;
  aggregateId: string;
  type: string;
  payload: Record<string, unknown>;
  traceId?: string;
  createdAt: Date;
}

export interface OutboxRepositoryPort {
  save(message: OutboxMessage): Promise<void>;
  fetchPendingMessages(batchSize: number): Promise<OutboxMessage[]>;
  markAsProcessed(id: string): Promise<void>;
}
