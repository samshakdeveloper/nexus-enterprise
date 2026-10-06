import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Kysely, PostgresDialect, sql } from "kysely";
import * as pg from "pg";

const { Pool } = pg;

let container: StartedPostgreSqlContainer | null = null;
let db: Kysely<unknown>;

async function isLocalPostgresAvailable(connectionString: string): Promise<boolean> {
  const testPool = new Pool({ connectionString, connectionTimeoutMillis: 1000 });
  try {
    const client = await testPool.connect();
    client.release();
    await testPool.end();
    return true;
  } catch {
    await testPool.end().catch(() => {});
    return false;
  }
}

export async function setupTestDatabase() {
  // ۱. بررسی وجود کانتینر/دیتابیس در دسترس روی لوکال
  const localConnectionString =
    process.env["DATABASE_URL"] || "postgresql://postgres:postgres@localhost:5432/test_outbox_db";
  const localAvailable = await isLocalPostgresAvailable(localConnectionString);

  let connectionString = localConnectionString;

  if (localAvailable) {
    // اگر nexus-postgres بالا باشد، از آن استفاده می‌شود
    console.log("⚡ Using local running PostgreSQL container.");
  } else {
    // ۲. اگر کانتینر لوکال فعال نبود، Testcontainers جدید بالا می‌آورد
    console.log("🐳 Local Postgres not reachable. Starting Testcontainers...");
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("test_outbox_db")
      .withUsername("postgres")
      .withPassword("postgres")
      .withTmpFs({ "/var/lib/postgresql/data": "rw" })
      .start();

    connectionString = container.getConnectionUri();
  }

  // ۳. ساخت کلاینت Kysely
  db = new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });

  // ۴. ساخت جدول
  await sql`
        CREATE TABLE IF NOT EXISTS outbox (
            id VARCHAR(36) PRIMARY KEY,
            aggregate_id VARCHAR(36) NOT NULL,
            event_name VARCHAR(100) NOT NULL,
            payload JSONB NOT NULL,
            trace_id VARCHAR(100),
            processed_at TIMESTAMP WITH TIME ZONE,
            occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `.execute(db);

  return { db, connectionString };
}

export async function teardownTestDatabase() {
  if (db) await db.destroy();
  // فقط اگر کانتینر توسط Testcontainers ساخته شده بود آن را stop کن
  if (container) await container.stop();
}

export async function clearOutboxTable(db: Kysely<unknown>) {
  await sql`TRUNCATE TABLE outbox`.execute(db);
}
