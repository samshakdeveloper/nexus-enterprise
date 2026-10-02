import { describe, it, expect } from "vitest";
import { Email } from "../src/user/value-objects/email.vo.js";
import { InvalidEmailException } from "../src/user/exceptions/user.exceptions";

describe("Email value object", () => {
  it("normalizes casing and trims whitespace", () => {
    expect(Email.create("  Foo@BAR.com ").value).toBe("foo@bar.com");
  });

  it.each(["", "no-at-sign", "a@b", "a@@b.com", "a".repeat(255) + "@b.com"])("rejects invalid input: %s", (input) => {
    expect(() => Email.create(input)).toThrow(InvalidEmailException);
  });

  it("two emails with the same normalized value are equal", () => {
    expect(Email.create("A@b.com").equals(Email.create("a@B.com"))).toBe(true);
  });
});
