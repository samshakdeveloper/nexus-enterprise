import type { UnitOfWorkPort } from "@nexus/application";
import type { Kysely } from "kysely";

import type { PostgresTablesContract } from "./postgres-tables.contract.js";

export class PostgresUnitOfWorkAdapter implements UnitOfWorkPort {
  constructor(private readonly db: Kysely<PostgresTablesContract>) {}

  public async withTransaction<T>(work: (trx: Kysely<PostgresTablesContract>) => Promise<T>): Promise<T> {
    return this.db.transaction().execute(async (trx) => work(trx as unknown as Kysely<PostgresTablesContract>));
  }
}
