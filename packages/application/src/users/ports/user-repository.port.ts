import type { User, UserId, Email } from "@nexus/domain";

/**
 * Outbound port for User persistence. The application layer depends only
 * on this interface; infrastructure provides the Postgres/Kysely
 * implementation. This is what makes the CreateUser use case testable with
 * an in-memory fake and swappable to any storage technology.
 */
export interface UserRepositoryPort {
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
}
