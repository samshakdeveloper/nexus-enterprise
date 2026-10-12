import { OutboxRepositoryPort, OutboxMessage } from "@nexus/application";
import type { PostgresTablesContract } from "@nexus/infrastructure";
import { Kysely, sql } from "kysely";

export class OutboxRepositoryAdapter implements OutboxRepositoryPort {
  constructor(private readonly db: Kysely<PostgresTablesContract>) {}

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

    const result = await query.execute(this.db);

    return result.rows.map((row: OutboxMessage): OutboxMessage => ({
      ...row,
      aggregateType: row.type.split(".")[0] || "User",
      occurred_at: row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at),
    }));
  }

  async markAsProcessed(id: string): Promise<void> {
    const query = sql`UPDATE outbox SET processed_at = NOW() WHERE id = ${id}`;
    await query.execute(this.db);
  }

  save(_message: OutboxMessage): Promise<void> {
    throw new Error(
      "OutboxRepositoryAdapter.save() is not implemented — outbox rows are written by the API within its transaction.",
    );
  }
}
