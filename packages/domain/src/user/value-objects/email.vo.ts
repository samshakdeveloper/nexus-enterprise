import { ValueObject } from "../../shared/value-object.js";
import { InvalidEmailException } from "../exceptions/user.exceptions.js";

type EmailProps = {
  value: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email value object. Self-validating: it is a programmer error to ever
 * hold an Email instance that isn't RFC-plausible and normalized, so
 * validation happens once, at construction, not scattered across layers.
 */
export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  public static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized) || normalized.length > 254) {
      throw new InvalidEmailException(raw);
    }
    return new Email({ value: normalized });
  }

  public get value(): string {
    return this.props.value;
  }

  public override toString(): string {
    return this.props.value;
  }
}
