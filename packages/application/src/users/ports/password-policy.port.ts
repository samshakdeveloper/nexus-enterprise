import type { Result } from "@nexus/shared";

export interface PasswordPolicyViolation {
  reason: string;
}

/**
 * Application-level policy service (not a domain rule): decides whether a
 * *plaintext* password is acceptable before it's ever hashed. Lives here
 * rather than in the domain because password strength rules are a product/
 * security policy that changes independently of what makes a User valid.
 */
export interface PasswordPolicyPort {
  validate(plainTextPassword: string): Result<true, PasswordPolicyViolation>;
}
