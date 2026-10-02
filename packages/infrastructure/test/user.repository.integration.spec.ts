import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {newDb} from "pg-mem";
import type {Kysely} from "kysely";
import {Email, FullName, HashedPassword, User, UserId, VerificationCode} from "@nexus/domain";
import type {PostgresTablesContract} from "../src";
import {PostgresUserRepositoryAdapter} from "../src";

describe("PostgresUserRepository (pg-mem integration)", () => {
  let db: Kysely<PostgresTablesContract>;
  let repo: PostgresUserRepositoryAdapter;

  beforeAll(async () => {
    const mem = newDb({ autoCreateForeignKeyIndices: true });
    mem.public.registerFunction({ name: "now", implementation: () => new Date() });
      db = mem.adapters.createKysely() as Kysely<PostgresTablesContract>;

    await db.schema
        .createTable("users")
        .addColumn("id", "uuid", (c) => c.primaryKey())
        .addColumn("email", "varchar(254)", (c) => c.notNull().unique())
        .addColumn("full_name", "varchar(120)", (c) => c.notNull())
        .addColumn("hashed_password", "text", (c) => c.notNull())
        .addColumn("status", "varchar(32)", (c) => c.notNull())
        .addColumn("verification_code", "varchar(6)", (c) => c.notNull()) // <--- اضافه شد
        .addColumn("verification_code_expires_at", "timestamp", (c) => c.notNull()) // <--- اضافه شد
        .addColumn("created_at", "timestamp", (c) => c.notNull())
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
          id: UserId.create("018f0000-0000-7000-8000-000000000001"),
          email: Email.create("Ada@Example.com"),
          fullName: FullName.create("Ada Lovelace"),
          hashedPassword: HashedPassword.fromHash("$2b$12$abcdefghijklmnopqrstuv"),
          verificationCode: VerificationCode.create("123456"),
          verificationCodeExpiresAt: new Date("2026-01-01T01:00:00Z"),
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
        {
          idGenerator: { generate: () => "evt-1" },
          clock: { now: () => new Date("2026-01-01T00:00:00Z") },
        },
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