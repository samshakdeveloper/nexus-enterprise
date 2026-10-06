import { describe, expect, it } from "vitest";
import { DefaultPasswordPolicyService } from "../src";

describe("DefaultPasswordPolicyService", () => {
  const service = new DefaultPasswordPolicyService();

  it("should return ok(true) for a valid password", () => {
    const result = service.validate("Pass1234");

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.value).toBe(true);
  });

  describe("Validation Failures", () => {
    it("should fail when password length is less than 8 characters", () => {
      const result = service.validate("Pass1");

      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual({
        reason: "Password must be at least 8 characters long.",
      });
    });

    it("should fail when password lacks uppercase letters", () => {
      const result = service.validate("password123");

      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual({
        reason: "Password must contain both upper and lower case letters.",
      });
    });

    it("should fail when password lacks lowercase letters", () => {
      const result = service.validate("PASSWORD123");

      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual({
        reason: "Password must contain both upper and lower case letters.",
      });
    });

    it("should fail when password lacks a digit", () => {
      const result = service.validate("PasswordNoDigit");

      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual({
        reason: "Password must contain at least one digit.",
      });
    });
  });
});
