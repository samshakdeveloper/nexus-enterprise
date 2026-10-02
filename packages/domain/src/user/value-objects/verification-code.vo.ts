// domain/src/user/value-objects/verification-code.vo.ts
export class VerificationCode {
  private constructor(public readonly value: string) {
    // Fail-fast validation (مثلاً طول کد یا فرمت آن)
  }

  public static create(raw: string): VerificationCode {
    if (!raw || raw.trim().length === 0) {
      throw new Error("Verification code cannot be empty");
    }
    return new VerificationCode(raw);
  }
}
