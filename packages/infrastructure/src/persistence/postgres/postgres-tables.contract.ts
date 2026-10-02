import type { OutboxTableContract } from "./tables/outbox-table.contract.js";
import type { UsersTableContract } from "./tables/users-table.contract.js";

export interface PostgresTablesContract {
  users: UsersTableContract;
  outbox: OutboxTableContract;
}
