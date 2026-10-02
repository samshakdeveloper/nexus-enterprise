import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import type { PostgresTablesContract } from "./postgres-tables.contract.js";

export class PostgresInstanceAdapter {
  private constructor() {}

  public static createInstance(connectionString: string): Kysely<PostgresTablesContract> {
    const pool = new pg.Pool({ connectionString, max: 10 });
    return new Kysely<PostgresTablesContract>({
      dialect: new PostgresDialect({ pool }),
    });
  }
}
