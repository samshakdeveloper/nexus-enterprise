import { describe, it, expect } from "vitest";
import { User } from "../src/user/user.aggregate.js";
import { InvalidEmailException, InvalidUserNameException } from "../src/user/exceptions/user.exceptions";

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

const VALID_HASH = "$2b$12$abcdefghijklmnopqrstuv"; // shape only, not a real bcrypt hash

function makeDeps() {
  return { idGenerator: new SequentialIdGenerator(), clock: new FixedClock() };
}

describe("User aggregate", () => {
  it("registers a new user in PENDING_VERIFICATION status and raises UserCreatedEvent", () => {
    const user = User.register(
      {
        id: "11111111-1111-1111-1111-111111111111",
        email: "Ada@Example.com",
        fullName: "Ada Lovelace",
        hashedPassword: VALID_HASH,
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
    expect(() =>
      User.register(
        { id: "id", email: "not-an-email", fullName: "Ada Lovelace", hashedPassword: VALID_HASH },
        makeDeps(),
      ),
    ).toThrow(InvalidEmailException);
  });

  it("rejects a too-short full name", () => {
    expect(() =>
      User.register({ id: "id", email: "a@b.com", fullName: "A", hashedPassword: VALID_HASH }, makeDeps()),
    ).toThrow(InvalidUserNameException);
  });

  it("clears domain events after they have been drained", () => {
    const user = User.register(
      { id: "id", email: "a@b.com", fullName: "Ada Lovelace", hashedPassword: VALID_HASH },
      makeDeps(),
    );
    user.clearEvents();
    expect(user.domainEvents).toHaveLength(0);
  });
});
