import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { newDb } from "pg-mem";
import type { Kysely } from "kysely";
import { User, Email } from "@nexus/domain";
import { PostgresUserRepositoryAdapter } from "../src/persistence/postgres/postgres-user-repository.adapter";
import type { Database } from "../src/persistence/postgres/postgres-schema";

/**
 * Integration test against pg-mem — an in-memory Postgres-compatible
 * engine. This exercises the REAL SQL (via Kysely) without requiring a
 * live Postgres container, which keeps this suite fast enough to run on
 * every commit; a separate, smaller Testcontainers-backed suite (see
 * README) runs against real Postgres in CI before merge to catch any
 * pg-mem/Postgres semantic drift.
 */
describe("PostgresUserRepository (pg-mem integration)", () => {
  let db: Kysely<Database>;
  let repo: PostgresUserRepositoryAdapter;

  beforeAll(async () => {
    const mem = newDb({ autoCreateForeignKeyIndices: true });
    mem.public.registerFunction({ name: "now", implementation: () => new Date() });
    const adapter = mem.adapters.createKysely() as Kysely<Database>;
    db = adapter;

    await db.schema
      .createTable("users")
      .addColumn("id", "uuid", (c) => c.primaryKey())
      .addColumn("email", "varchar(254)", (c) => c.notNull().unique())
      .addColumn("full_name", "varchar(120)", (c) => c.notNull())
      .addColumn("hashed_password", "text", (c) => c.notNull())
      .addColumn("status", "varchar(32)", (c) => c.notNull())
      .addColumn("created_at", "timestamptz", (c) => c.notNull())
      .addColumn("version", "integer", (c) => c.notNull().defaultTo(0))
      .execute();

    repo = new PostgresUserRepositoryAdapter(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("saves a user and finds it back by email, normalized", async () => {
    const user = User.register(
      {
        id: "018f0000-0000-7000-8000-000000000001",
        email: "Ada@Example.com",
        fullName: "Ada Lovelace",
        hashedPassword: "$2b$12$abcdefghijklmnopqrstuv",
      },
      { idGenerator: { generate: () => "evt-1" }, clock: { now: () => new Date("2026-01-01T00:00:00Z") } },
    );

    await repo.save(user);

    const found = await repo.findByEmail(Email.create("Ada@Example.com"));
    expect(found).not.toBeNull();
    expect(found?.email.value).toBe("ada@example.com");
  });

  it("reports existsByEmail correctly", async () => {
    const exists = await repo.existsByEmail(Email.create("ada@example.com"));
    expect(exists).toBe(true);
    const notExists = await repo.existsByEmail(Email.create("nobody@example.com"));
    expect(notExists).toBe(false);
  });
});
