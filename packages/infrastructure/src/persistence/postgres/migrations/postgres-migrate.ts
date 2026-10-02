import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import { Migrator, MigrationProvider, Migration } from "kysely";

import { PostgresInstanceAdapter } from "../postgres-instance.adapter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../../../../.env") });

// 🛠️ ساخت یک Provider اختصاصی و سازگار با ESM در ویندوز
class EsmFileMigrationProvider implements MigrationProvider {
  constructor(private readonly relativePath: string) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    const migrationsFolder = path.join(__dirname, this.relativePath);
    const files = await fs.readdir(migrationsFolder);
    const migrations: Record<string, Migration> = {};

    for (const file of files) {
      if (file.endsWith(".ts") || file.endsWith(".js")) {
        const filePath = path.join(migrationsFolder, file);
        // 🔑 تبدیل قطعی مسیر ویندوز به file:// URL برای ESM
        const fileUrl = pathToFileURL(filePath).href;
        const migration = (await import(fileUrl)) as Migration;
        const migrationName = file.replace(/\.(ts|js)$/, "");
        migrations[migrationName] = migration;
      }
    }

    return migrations;
  }
}

async function main() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const db = PostgresInstanceAdapter.createInstance(connectionString);

  const migrator = new Migrator({
    db,
    // 👈 استفاده از Provider اصلاح‌شده بدون باگ ESM ویندوز
    provider: new EsmFileMigrationProvider("files"),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((r) => {
    console.log(`[migrate] ${r.status}: ${r.migrationName}`);
  });

  if (error) {
    console.error("[migrate] failed", error);
    process.exit(1);
  }

  await db.destroy();
}

void main();
