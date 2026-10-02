import { EmailAlreadyInUseError, type UserRepositoryPort } from "@nexus/application";
import { User, UserId, Email, FullName, HashedPassword, type UserStatus, VerificationCode } from "@nexus/domain";
import type { Kysely, Selectable } from "kysely";

import type { PostgresTablesContract } from "../postgres-tables.contract.js";
import type { UsersTableContract } from "../tables/users-table.contract.js";

/**
 * Postgres unique_violation — see https://www.postgresql.org/docs/current/errcodes-appendix.html.
 * pg surfaces this as a plain `Error` decorated with a `code` string, not a
 * distinct exported class, so we duck-type it instead of importing a class.
 */
const POSTGRES_UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): error is { code: string; constraint?: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === POSTGRES_UNIQUE_VIOLATION;
}

/**
 * Postgres adapter for the UserRepository port (Kysely as a type-safe SQL
 * builder — not a full ORM, so mapping row <-> aggregate stays explicit
 * and auditable, matching the DDD preference for the domain owning its
 * own reconstruction logic).
 */
export class PostgresUserRepositoryAdapter implements UserRepositoryPort {
  constructor(private readonly db: Kysely<PostgresTablesContract>) {}

  public async findByEmail(email: Email): Promise<User | null> {
    const row = await this.db.selectFrom("users").selectAll().where("email", "=", email.value).executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  public async existsByEmail(email: Email): Promise<boolean> {
    const row = await this.db.selectFrom("users").select("id").where("email", "=", email.value).executeTakeFirst();
    return row !== undefined;
  }

  public async findById(id: UserId): Promise<User | null> {
    const row = await this.db.selectFrom("users").selectAll().where("id", "=", id.value).executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  public async save(user: User): Promise<void> {
    const primitives = user.toPrimitives();
    try {
      await this.db
        .insertInto("users")
        .values({
          id: primitives.id,
          email: primitives.email,
          full_name: primitives.fullName,
          hashed_password: user.hashedPassword.value,
          status: primitives.status,
          created_at: primitives.createdAt,
          verification_code: primitives.verificationCode ?? null,
          verification_code_expires_at: primitives.verificationCodeExpiresAt ?? null,
        })
        .execute();
    } catch (error) {
      // The unique index on `email` is the real invariant enforcer — the
      // application-level `existsByEmail` check is only a fast-path for a
      // friendly error in the common case, so a concurrent request that
      // wins the TOCTOU race still surfaces as the same domain-level error
      // instead of an unhandled 500.
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyInUseError(primitives.email);
      }
      throw error;
    }
  }

  /** Rehydrates a persisted row into a domain aggregate via the same VO factories used on the write path — no unsafe casts, no bypassing validation. */
  private toDomain(row: Selectable<UsersTableContract>): User {
    return User.reconstitute(UserId.create(row.id), {
      email: Email.create(row.email),
      fullName: FullName.create(row.full_name),
      hashedPassword: HashedPassword.fromHash(row.hashed_password),
      status: row.status as UserStatus,
      createdAt: row.created_at,
      verificationCode: row.verification_code ? VerificationCode.create(row.verification_code) : undefined,
      verificationCodeExpiresAt: row.verification_code_expires_at ?? undefined,
    });
  }
}
