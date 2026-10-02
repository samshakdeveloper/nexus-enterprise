import { describe, it, expect } from "vitest";
import {
  User,
  UserId,
  Email,
  FullName,
  HashedPassword,
  VerificationCode,
  InvalidEmailException,
  InvalidUserNameException,
} from "../src";

class FixedClock {
  now() {
    return new Date("2026-01-01T00:00:00.000Z");
  }
}

class SequentialIdGenerator {
  private n = 0;
  generate() {
    this.n += 1;
    return `id-${this.n}`;
  }
}

const VALID_HASH = "$2b$12$abcdefghijklmnopqrstuv"; // shape only

function makeDeps() {
  return { idGenerator: new SequentialIdGenerator(), clock: new FixedClock() };
}

describe("User aggregate", () => {
  it("registers a new user in PENDING_VERIFICATION status and raises UserCreatedEvent", () => {
    const user = User.register(
        {
          id: UserId.create("11111111-1111-1111-1111-111111111111"),
          email: Email.create("Ada@Example.com"),
          fullName: FullName.create("Ada Lovelace"),
          hashedPassword: HashedPassword.fromHash(VALID_HASH),
          verificationCode: VerificationCode.create("123456"),
          verificationCodeExpiresAt: new Date("2026-01-01T01:00:00.000Z"),
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        makeDeps(),
    );

    expect(user.status).toBe("PENDING_VERIFICATION");
    expect(user.email.value).toBe("ada@example.com"); // normalized
    expect(user.domainEvents).toHaveLength(1);
    expect(user.domainEvents[0]?.eventName).toBe("user.created");
    expect(user.domainEvents[0]?.payload).toMatchObject({ email: "ada@example.com" });
  });

  it("rejects an invalid email", () => {
    expect(() => Email.create("not-an-email")).toThrow(InvalidEmailException);
  });

  it("rejects a too-short full name", () => {
    expect(() => FullName.create("A")).toThrow(InvalidUserNameException);
  });

  it("clears domain events after they have been drained", () => {
    const user = User.register(
        {
          id: UserId.create("11111111-1111-1111-1111-111111111111"),
          email: Email.create("a@b.com"),
          fullName: FullName.create("Ada Lovelace"),
          hashedPassword: HashedPassword.fromHash(VALID_HASH),
          verificationCode: VerificationCode.create("123456"),
          verificationCodeExpiresAt: new Date("2026-01-01T01:00:00.000Z"),
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        makeDeps(),
    );
    user.clearEvents();
    expect(user.domainEvents).toHaveLength(0);
  });
});