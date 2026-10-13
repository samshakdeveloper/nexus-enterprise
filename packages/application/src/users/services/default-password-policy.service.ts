import { Result } from "@nexus/shared";

import type { PasswordPolicyPort, PasswordPolicyViolation } from "../ports/password-policy.port.js";

export class DefaultPasswordPolicyService implements PasswordPolicyPort {

  public validate(plainTextPassword: string): Result<true, PasswordPolicyViolation> {
    // ۱. بررسی طول پسورد (تست شماره ۲)
    if (plainTextPassword.length < 8) {
      return Result.fail({
        reason: "Password must be at least 8 characters long."
      });
    }

    // ۲. بررسی وجود حروف بزرگ و کوچک (تست‌های شماره ۳ و ۴)
    const hasUppercase = /[A-Z]/.test(plainTextPassword);
    const hasLowercase = /[a-z]/.test(plainTextPassword);
    if (!hasUppercase || !hasLowercase) {
      return Result.fail({
        reason: "Password must contain both upper and lower case letters."
      });
    }

    // ۳. بررسی وجود اعداد (تست شماره ۵)
    const hasDigit = /\d/.test(plainTextPassword);
    if (!hasDigit) {
      return Result.fail({
        reason: "Password must contain at least one digit."
      });
    }
    return Result.ok(true);
  }
}