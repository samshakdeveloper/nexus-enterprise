import type { ColumnType, Generated } from "kysely";

export interface UsersTableContract {
  id: string;
  email: string;
  full_name: string;
  hashed_password: string;
  status: string;
  created_at: ColumnType<Date, string | Date, never>;
  version: Generated<number>;
  verification_code: string | null;
  verification_code_expires_at: Date | null;
}
