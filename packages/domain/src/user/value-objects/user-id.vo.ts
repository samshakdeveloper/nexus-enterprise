import { ValueObject } from "../../shared/value-object.js";

type UserIdProps = {
  value: string;
};

/** Identity value object — wraps a UUID so a raw string can never be mistaken for a UserId. */
export class UserId extends ValueObject<UserIdProps> {
  private constructor(props: UserIdProps) {
    super(props);
  }

  public static create(value: string): UserId {
    if (!value || value.trim().length === 0) {
      throw new Error("UserId cannot be empty.");
    }
    return new UserId({ value });
  }

  public get value(): string {
    return this.props.value;
  }

  public override toString(): string {
    return this.props.value;
  }
}
