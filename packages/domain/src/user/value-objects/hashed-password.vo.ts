import { ValueObject } from "../../shared/value-object.js";

type HashedPasswordProps = {
  value: string;
};

/**
 * Wraps an ALREADY-HASHED password. The domain never sees or validates raw
 * passwords for strength here — that policy lives in application layer
 * (PasswordPolicy service) so it can evolve without touching the aggregate;
 * this VO's only job is to guarantee a plaintext string can never silently
 * flow into the "hashed" slot of the User aggregate.
 */
export class HashedPassword extends ValueObject<HashedPasswordProps> {
  private constructor(props: HashedPasswordProps) {
    super(props);
  }

  public static fromHash(hash: string): HashedPassword {
    if (!hash || hash.length < 20) {
      throw new Error("Value does not look like a valid password hash.");
    }
    return new HashedPassword({ value: hash });
  }

  public get value(): string {
    return this.props.value;
  }
}
