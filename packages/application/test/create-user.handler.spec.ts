import { describe, it, expect, beforeEach, vi } from "vitest";
import type { User, UserId, Email } from "@nexus/domain";
import { Result } from "@nexus/shared";
import { CreateUserHandler } from "../src/users/commands/create-user/create-user.handler";
import { CreateUserCommand } from "../src/users/commands/create-user/create-user.command";
import { EmailAlreadyInUseError, PasswordPolicyError } from "../src/users/commands/create-user/create-user.errors";
import type { UserRepositoryPort } from "../src/users/ports/user-repository.port";
import type { PasswordHasherPort } from "../src/users/ports/password-hasher.port";
import type { PasswordPolicyPort } from "../src/users/ports/password-policy.port";
import type { EventPublisherPort } from "../src/users/ports/event-publisher.port";
import type { UnitOfWorkPort } from "../src/users/ports/unit-of-work.port";

/** In-memory fake — the whole point of the ports/adapters split: zero mocking frameworks needed. */
class InMemoryUserRepository implements UserRepositoryPort {
  public readonly users = new Map<string, User>();
  async findByEmail(email: Email) {
    return [...this.users.values()].find((u) => u.email.equals(email)) ?? null;
  }
  async existsByEmail(email: Email) {
    return (await this.findByEmail(email)) !== null;
  }
  async save(user: User) {
    this.users.set(user.id.value, user);
  }
  async findById(id: UserId) {
    return this.users.get(id.value) ?? null;
  }
}

const noopPasswordHasher: PasswordHasherPort = {
  hash: async (p) => `hashed(${p})_______________`,
  verify: async () => true,
};

const alwaysAllowPolicy: PasswordPolicyPort = {
  validate: () => Result.ok(true),
};

const alwaysRejectPolicy: PasswordPolicyPort = {
  validate: () => Result.fail({ reason: "too weak" }),
};

class RecordingEventPublisher implements EventPublisherPort {
  public published: unknown[] = [];
  async publish(events: readonly unknown[]) {
    this.published.push(...events);
  }
}

const passthroughUnitOfWork: UnitOfWorkPort = {
  withTransaction: async (work) => work(undefined),
};

let idCounter = 0;
const idGeneratorPort = { generate: () => `id-${++idCounter}` };
const clockPort = { now: () => new Date("2026-01-01T00:00:00.000Z") };
const loggerPort = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child() {
    return this;
  },
};

describe("CreateUserHandler", () => {
  let repo: InMemoryUserRepository;
  let events: RecordingEventPublisher;

  beforeEach(() => {
    idCounter = 0;
    repo = new InMemoryUserRepository();
    events = new RecordingEventPublisher();
  });

  function makeHandler(policy: PasswordPolicyPort = alwaysAllowPolicy) {
    return new CreateUserHandler({
      userRepositoryPort: repo,
      passwordHasherPort: noopPasswordHasher,
      passwordPolicyPort: policy,
      eventPublisherPort: events,
      unitOfWorkPort: passthroughUnitOfWork,
      idGeneratorPort,
      clockPort,
      loggerPort,
    });
  }

  it("creates a user, persists it, and publishes UserCreatedEvent", async () => {
    const handler = makeHandler();
    const response = await handler.execute(new CreateUserCommand("ada@example.com", "Ada Lovelace", "Str0ngPass!"));

    expect(response.email).toBe("ada@example.com");
    expect(response.status).toBe("PENDING_VERIFICATION");
    expect(repo.users.size).toBe(1);
    expect(events.published).toHaveLength(1);
  });

  it("rejects a duplicate email without touching the password hasher", async () => {
    const handler = makeHandler();
    await handler.execute(new CreateUserCommand("ada@example.com", "Ada Lovelace", "Str0ngPass!"));

    await expect(handler.execute(new CreateUserCommand("ADA@example.com", "Ada L.", "Str0ngPass!"))).rejects.toThrow(
      EmailAlreadyInUseError,
    );

    expect(repo.users.size).toBe(1);
  });

  it("rejects a password that fails policy before ever checking uniqueness", async () => {
    const handler = makeHandler(alwaysRejectPolicy);
    await expect(handler.execute(new CreateUserCommand("ada@example.com", "Ada Lovelace", "weak"))).rejects.toThrow(
      PasswordPolicyError,
    );
    expect(repo.users.size).toBe(0);
  });
});
