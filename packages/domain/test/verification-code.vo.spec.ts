import { describe, it, expect } from "vitest";
import { VerificationCode } from "../src";

describe("VerificationCode Value Object", () => {
  it("should create a valid VerificationCode instance", () => {
    const rawCode = "123456";
    const verificationCode = VerificationCode.create(rawCode);

    expect(verificationCode).toBeInstanceOf(VerificationCode);
    expect(verificationCode.value).toBe(rawCode);
  });

  it("should throw an error when created with an empty string", () => {
    expect(() => VerificationCode.create("")).toThrow("Verification code cannot be empty");
  });

  it("should throw an error when created with only whitespace characters", () => {
    expect(() => VerificationCode.create("   ")).toThrow("Verification code cannot be empty");
  });
});

it("should create a valid VerificationCode instance", () => {
  const rawCode = "123456";
  const verificationCode = VerificationCode.create(rawCode);

  expect(verificationCode).toBeInstanceOf(VerificationCode);
  expect(verificationCode.value).toBe(rawCode);
});

it("should throw an error when created with an empty string", () => {
  expect(() => VerificationCode.create("")).toThrow("Verification code cannot be empty");
});

it("should throw an error when created with only whitespace characters", () => {
  expect(() => VerificationCode.create("   ")).toThrow("Verification code cannot be empty");
});
