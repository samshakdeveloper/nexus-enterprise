import { ValueObject } from "../../shared/value-object.js";
import { InvalidUserNameException } from "../exceptions/user.exceptions.js";

type FullNameProps = {
  value: string;
};

export class FullName extends ValueObject<FullNameProps> {
  private static readonly MIN_LENGTH = 2;
  private static readonly MAX_LENGTH = 120;

  private constructor(props: FullNameProps) {
    super(props);
  }

  public static create(raw: string): FullName {
    const trimmed = raw.trim();
    if (trimmed.length < FullName.MIN_LENGTH) {
      throw new InvalidUserNameException(`must be at least ${FullName.MIN_LENGTH} characters`);
    }
    if (trimmed.length > FullName.MAX_LENGTH) {
      throw new InvalidUserNameException(`must be at most ${FullName.MAX_LENGTH} characters`);
    }
    return new FullName({ value: trimmed });
  }

  public get value(): string {
    return this.props.value;
  }
}
