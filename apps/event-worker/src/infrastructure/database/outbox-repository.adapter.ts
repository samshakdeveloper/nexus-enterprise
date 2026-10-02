import { OutboxRepositoryPort, OutboxMessage } from "@nexus/application";
import { PostgresInstanceAdapter } from "@nexus/infrastructure";
import { sql } from "kysely";

import { loadEnv } from "../../config/env.js";

export class OutboxRepositoryAdapter implements OutboxRepositoryPort {
  private db: any;

  constructor() {
    const env = loadEnv();
    this.db = PostgresInstanceAdapter.createInstance(env.DATABASE_URL);
  }

  async fetchPendingMessages(batchSize: number): Promise<OutboxMessage[]> {
    const query = sql`
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

    return result.rows.map((row: any) => ({
      ...row,
      aggregateType: row.type.split(".")[0] || "User",
    }));
  }

  async markAsProcessed(id: string): Promise<void> {
    const query = sql`UPDATE outbox SET processed_at = NOW() WHERE id = ${id}`;
    await query.execute(this.db);
  }

  async save(message: OutboxMessage): Promise<void> {
    // پیاده‌سازی متد save در صورت نیاز
  }
}
