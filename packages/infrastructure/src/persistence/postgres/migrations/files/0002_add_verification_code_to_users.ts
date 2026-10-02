import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("verification_code", "varchar(32)") // به صورت Nullable اضافه میشه
    .addColumn("verification_code_expires_at", "timestamptz")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .dropColumn("verification_code")
    .dropColumn("verification_code_expires_at")
    .execute();
}
