import { describe, it, expect } from "vitest";
import { UserId } from "../src";

describe("UserId Value Object", () => {
  it("should create a valid UserId instance", () => {
    const rawId = "01a0ff3d-8f66-7aa3-8fc7-9e1e9f1057cb";
    const userId = UserId.create(rawId);

    expect(userId).toBeInstanceOf(UserId);
    expect(userId.value).toBe(rawId);
  });

  it("should return the correct string representation when calling toString()", () => {
    const rawId = "01a0ff3d-8f66-7aa3-8fc7-9e1e9f1057cb";
    const userId = UserId.create(rawId);

    expect(userId.toString()).toBe(rawId);
  });

  it("should throw an error when created with an empty string", () => {
    expect(() => UserId.create("")).toThrow("UserId cannot be empty.");
  });

  it("should throw an error when created with only whitespace characters", () => {
    expect(() => UserId.create("   ")).toThrow("UserId cannot be empty.");
  });

  it("should correctly compare two UserId instances for equality", () => {
    const idStr = "01a0ff3d-8f66-7aa3-8fc7-9e1e9f1057cb";
    const userId1 = UserId.create(idStr);
    const userId2 = UserId.create(idStr);
    const userId3 = UserId.create("01a0ff3d-8fa2-7aa3-8fc7-a835269c880e");

    expect(userId1.equals(userId2)).toBe(true);
    expect(userId1.equals(userId3)).toBe(false);
  });
});

it("should create a valid UserId instance", () => {
  const rawId = "01a0ff3d-8f66-7aa3-8fc7-9e1e9f1057cb";
  const userId = UserId.create(rawId);

  expect(userId).toBeInstanceOf(UserId);
  expect(userId.value).toBe(rawId);
});

it("should return the correct string representation when calling toString()", () => {
  const rawId = "01a0ff3d-8f66-7aa3-8fc7-9e1e9f1057cb";
  const userId = UserId.create(rawId);

  expect(userId.toString()).toBe(rawId);
});

it("should throw an error when created with an empty string", () => {
  expect(() => UserId.create("")).toThrow("UserId cannot be empty.");
});

it("should throw an error when created with only whitespace characters", () => {
  expect(() => UserId.create("   ")).toThrow("UserId cannot be empty.");
});

it("should correctly compare two UserId instances for equality", () => {
  const idStr = "01a0ff3d-8f66-7aa3-8fc7-9e1e9f1057cb";
  const userId1 = UserId.create(idStr);
  const userId2 = UserId.create(idStr);
  const userId3 = UserId.create("01a0ff3d-8fa2-7aa3-8fc7-a835269c880e");

  expect(userId1.equals(userId2)).toBe(true);
  expect(userId1.equals(userId3)).toBe(false);
});
