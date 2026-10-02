import { Result } from "@nexus/shared";

import type { PasswordPolicyPort, PasswordPolicyViolation } from "../ports/password-policy.port.js";

const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_DIGIT = /\d/;

export class DefaultPasswordPolicyService implements PasswordPolicyPort {
  public validate(plainTextPassword: string): Result<true, PasswordPolicyViolation> {
    if (plainTextPassword.length < 8) {
      return Result.fail({ reason: "Password must be at least 8 characters long." });
    }
    if (!HAS_UPPER.test(plainTextPassword) || !HAS_LOWER.test(plainTextPassword)) {
      return Result.fail({ reason: "Password must contain both upper and lower case letters." });
    }
    if (!HAS_DIGIT.test(plainTextPassword)) {
      return Result.fail({ reason: "Password must contain at least one digit." });
    }
    return Result.ok(true);
  }
}
