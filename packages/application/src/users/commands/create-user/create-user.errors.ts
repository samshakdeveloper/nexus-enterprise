export class EmailAlreadyInUseError extends Error {
  public readonly code = "USER.EMAIL_ALREADY_IN_USE";
  constructor(email: string) {
    super(`A user with email "${email}" already exists.`);
  }
}

export class PasswordPolicyError extends Error {
  public readonly code = "USER.PASSWORD_POLICY_VIOLATION";
  constructor(reason: string) {
    super(reason);
  }
}
