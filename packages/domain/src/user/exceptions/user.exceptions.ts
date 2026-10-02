import { DomainException } from "../../shared/domain-exception.js";

export class InvalidEmailException extends DomainException {
  public readonly code = "USER.INVALID_EMAIL";
  constructor(email: string) {
    super(`"${email}" is not a valid email address.`);
  }
}

export class InvalidUserNameException extends DomainException {
  public readonly code = "USER.INVALID_NAME";
  constructor(reason: string) {
    super(`Invalid user name: ${reason}`);
  }
}

export class WeakPasswordException extends DomainException {
  public readonly code = "USER.WEAK_PASSWORD";
  constructor(reason: string) {
    super(`Password does not meet policy: ${reason}`);
  }
}

export class DuplicateUserException extends DomainException {
  public readonly code = "USER.DUPLICATE_EMAIL";
  constructor(email: string) {
    super(`A user with email "${email}" already exists.`);
  }
}
