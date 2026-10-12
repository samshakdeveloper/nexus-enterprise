import type { LoggerPort } from "@nexus/shared";
import { trace } from "@opentelemetry/api";
import { sql, type Kysely } from "kysely";

import type { PostgresTablesContract } from "../../persistence/postgres/postgres-tables.contract.js";

export interface OutboxHandler {
  eventName: string;
  handle(payload: Record<string, unknown>): Promise<void>;
}

/**
 * Polls the outbox table for unprocessed rows and dispatches them to
 * registered handlers (welcome email, analytics, audit log — anything
 * that reacts to `user.created` without living inside the CreateUser
 * transaction). Each dispatch runs inside its own OpenTelemetry span
 * linked back to the trace that originally created the event.
 */
export class OutboxProcessor {
  private readonly handlers = new Map<string, OutboxHandler[]>();
  private readonly tracer = trace.getTracer("nexus.outbox-processor");

  constructor(
    private readonly db: Kysely<PostgresTablesContract>,
    private readonly logger: LoggerPort,
  ) {}

  public register(handler: OutboxHandler): void {
    const existing = this.handlers.get(handler.eventName) ?? [];
    existing.push(handler);
    this.handlers.set(handler.eventName, existing);
  }

  public async processBatch(batchSize = 50): Promise<number> {
    const rows = await sql<{
      id: string;
      aggregate_id: string;
      event_name: string;
      payload: unknown;
      occurred_at: Date;
      processed_at: Date | null;
    }>`
      SELECT * FROM outbox
      WHERE processed_at IS NULL
      ORDER BY occurred_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `
      .execute(this.db)
      .then((r) => r.rows);

    for (const row of rows) {
      await this.tracer.startActiveSpan(`outbox.process ${row.event_name}`, async (span) => {
        try {
          const handlers = this.handlers.get(row.event_name) ?? [];
          const payload = (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as Record<
            string,
            unknown
          >;
          await Promise.all(handlers.map((h) => h.handle(payload)));
          await this.db.updateTable("outbox").set({ processed_at: new Date() }).where("id", "=", row.id).execute();
        } catch (error) {
          this.logger.error(`Failed to process outbox event ${row.id}`, error);
          span.recordException(error as Error);
        } finally {
          span.end();
        }
      });
    }
    return rows.length;
  }
}
