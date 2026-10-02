/** Base class for all domain-layer exceptions — distinct from infrastructure/HTTP errors. */
export abstract class DomainException extends Error {
  public abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
