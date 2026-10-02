import type { ColumnType } from "kysely";

export interface OutboxTableContract {
  id: string;
  aggregate_id: string;
  event_name: string;
  payload: unknown;
  trace_id: string | null;
  occurred_at: ColumnType<Date, string | Date, never>;
  processed_at: ColumnType<Date | null, string | Date | null, string | Date>;
}
