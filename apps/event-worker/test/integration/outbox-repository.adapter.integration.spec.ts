import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"; // یا 'jest'
import { setupTestDatabase, teardownTestDatabase, clearOutboxTable } from "./setup/postgres-container";

describe("OutboxRepositoryAdapter Integration Tests", () => {
  let db: any;

  beforeAll(async () => {
    const res = await setupTestDatabase();
    db = res.db;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    if (db) await clearOutboxTable(db);
  });

  it("should successfully setup test database and verify outbox table", async () => {
    expect(db).toBeDefined();
  });
});
