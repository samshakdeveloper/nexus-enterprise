import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Kysely, PostgresDialect, sql } from "kysely";
import * as pg from "pg";

const { Pool } = pg;

let container: StartedPostgreSqlContainer | undefined;
let db: Kysely<unknown> | undefined;

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
    console.log("⚡ Using local running PostgreSQL container.");
  } else {
    console.log("🐳 Local Postgres not reachable. Starting Testcontainers...");
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("test_outbox_db")
      .withUsername("postgres")
      .withPassword("postgres")
      .withTmpFs({ "/var/lib/postgresql/data": "rw" })
      .start();

    connectionString = container.getConnectionUri();
  }

  // ۲. ساخت کلاینت Kysely با تنظیمات Pool برای بسته شدن تمیز
  db = new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 1000,
      }),
    }),
  });

  // ۳. ساخت جدول
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
  // ۱. ابتدا تمام connectionهای فعال بسته‌می‌شوند تا PG قطع ناگهانی نخورد
  if (db) {
    await db.destroy();
  }

  // ۲. مهلت کوتاه به سوکت‌های شبکه برای تخلیه
  await new Promise((resolve) => setTimeout(resolve, 300));

  // ۳. متوقف کردن کانتینر
  if (container) {
    await container.stop();
  }
}

export async function clearOutboxTable(dbClient: Kysely<unknown>) {
  await sql`TRUNCATE TABLE outbox`.execute(dbClient);
}
