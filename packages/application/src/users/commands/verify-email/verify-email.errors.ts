export class VerificationCodeInvalidError extends Error {
  public readonly code = "USER.VERIFICATION_CODE_INVALID";
  constructor() {
    super("The provided verification code is incorrect.");
  }
}

export class VerificationCodeExpiredError extends Error {
  public readonly code = "USER.VERIFICATION_CODE_EXPIRED";
  constructor(expiredAt: Date) {
    super(`The verification code expired at "${expiredAt.toISOString()}".`);
  }
}

export class UserAlreadyVerifiedError extends Error {
  public readonly code = "USER.ALREADY_VERIFIED";
  constructor(email: string) {
    super(`The user account with email "${email}" is already active.`);
  }
}
