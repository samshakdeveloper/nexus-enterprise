import { describe, it, expect } from "vitest";
import { FullName } from "../src";
import { InvalidUserNameException } from "../src";

describe("FullName Value Object", () => {
  it("should create a valid FullName and trim whitespace", () => {
    const rawName = "  Alex japan  ";
    const fullName = FullName.create(rawName);

    expect(fullName.value).toBe("Alex japan");
  });

  it("should allow a valid name with exactly 2 characters (MIN_LENGTH)", () => {
    const fullName = FullName.create("Ali");
    expect(fullName.value).toBe("Ali");
  });

  it("should allow a valid name with exactly 120 characters (MAX_LENGTH)", () => {
    const maxName = "a".repeat(120);
    const fullName = FullName.create(maxName);

    expect(fullName.value).toBe(maxName);
    expect(fullName.value.length).toBe(120);
  });

  it("should throw InvalidUserNameException when name is shorter than 2 characters", () => {
    expect(() => FullName.create("A")).toThrow(InvalidUserNameException);
    expect(() => FullName.create("  A  ")).toThrow(InvalidUserNameException);
    expect(() => FullName.create("")).toThrow(InvalidUserNameException);
  });

  it("should throw InvalidUserNameException when name exceeds 120 characters", () => {
    const overMaxName = "a".repeat(121);
    expect(() => FullName.create(overMaxName)).toThrow(InvalidUserNameException);
  });

  it("should correctly compare two FullName instances using equals", () => {
    const name1 = FullName.create("Alex japan");
    const name2 = FullName.create("Alex japan");
    const name3 = FullName.create("Other Name");

    expect(name1.equals(name2)).toBe(true);
    expect(name1.equals(name3)).toBe(false);
  });
});

it("should create a valid FullName and trim whitespace", () => {
  const rawName = "  Alex japan  ";
  const fullName = FullName.create(rawName);

  expect(fullName.value).toBe("Alex japan");
});

it("should allow a valid name with exactly 2 characters (MIN_LENGTH)", () => {
  const fullName = FullName.create("Ali");
  expect(fullName.value).toBe("Ali");
});

it("should allow a valid name with exactly 120 characters (MAX_LENGTH)", () => {
  const maxName = "a".repeat(120);
  const fullName = FullName.create(maxName);

  expect(fullName.value).toBe(maxName);
  expect(fullName.value.length).toBe(120);
});

it("should throw InvalidUserNameException when name is shorter than 2 characters", () => {
  expect(() => FullName.create("A")).toThrow(InvalidUserNameException);
  expect(() => FullName.create("  A  ")).toThrow(InvalidUserNameException);
  expect(() => FullName.create("")).toThrow(InvalidUserNameException);
});

it("should throw InvalidUserNameException when name exceeds 120 characters", () => {
  const overMaxName = "a".repeat(121);
  expect(() => FullName.create(overMaxName)).toThrow(InvalidUserNameException);
});

it("should correctly compare two FullName instances using equals", () => {
  const name1 = FullName.create("Alex japan");
  const name2 = FullName.create("Alex japan");
  const name3 = FullName.create("Other Name");

  expect(name1.equals(name2)).toBe(true);
  expect(name1.equals(name3)).toBe(false);
});
