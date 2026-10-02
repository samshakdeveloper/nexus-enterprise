interface Equatable {
  equals(other: unknown): boolean;
}

/**
 * Base Entity: identity-based equality.
 * Two entities are equal if their IDs are equal.
 */
export abstract class Entity<IdType> {
  protected readonly _id: IdType;

  protected constructor(id: IdType) {
    this._id = id;
  }

  public get id(): IdType {
    return this._id;
  }

  public equals(other?: Entity<IdType>): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    if (other.constructor !== this.constructor) return false;

    // اگر ID یک Value Object است و متد equals دارد
    if (this.isEquatable(this._id)) {
      return this._id.equals(other._id);
    }

    // مقایسه مستقیم برای Primitiveها (مثل string یا number)
    return this._id === other._id;
  }

  private isEquatable(value: unknown): value is Equatable {
    return (
      typeof value === "object" &&
      value !== null &&
      "equals" in value &&
      typeof (value as Equatable).equals === "function"
    );
  }
}
