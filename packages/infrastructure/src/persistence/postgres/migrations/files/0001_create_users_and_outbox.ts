import type { Kysely } from "kysely";

/**
 * A single hand-written migration is enough for this reference project's
 * one aggregate; a real system would use `kysely-migrate` or `node-pg-migrate`
 * with a numbered migrations directory exactly like this one, run via
 * `npm run migrate`.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("email", "varchar(254)", (col) => col.notNull().unique())
    .addColumn("full_name", "varchar(120)", (col) => col.notNull())
    .addColumn("hashed_password", "text", (col) => col.notNull())
    .addColumn("status", "varchar(32)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(db.fn("now")))
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createTable("outbox")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("aggregate_id", "uuid", (col) => col.notNull())
    .addColumn("event_name", "varchar(128)", (col) => col.notNull())
    .addColumn("payload", "jsonb", (col) => col.notNull())
    .addColumn("trace_id", "varchar(64)")
    .addColumn("occurred_at", "timestamptz", (col) => col.notNull())
    .addColumn("processed_at", "timestamptz")
    .execute();

  await db.schema.createIndex("outbox_unprocessed_idx").on("outbox").columns(["processed_at"]).execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("outbox").execute();
  await db.schema.dropTable("users").execute();
}
