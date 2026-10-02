/**
 * Result<T, E> — a railway-oriented result type used at every architectural
 * boundary (domain, application, infrastructure) instead of throwing for
 * expected failure paths. Exceptions are reserved for truly exceptional /
 * programmer-error situations; anticipated business failures are values.
 */
export class Result<T, E = Error> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  public static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  public static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  public get isSuccess(): boolean {
    return this._isSuccess;
  }

  public get isFailure(): boolean {
    return !this._isSuccess;
  }

  public get value(): T {
    if (!this._isSuccess) {
      throw new Error("Cannot access value of a failed Result");
    }
    return this._value as T;
  }

  public get error(): E {
    if (this._isSuccess) {
      throw new Error("Cannot access error of a successful Result");
    }
    return this._error as E;
  }

  public map<U>(fn: (value: T) => U): Result<U, E> {
    return this._isSuccess ? Result.ok(fn(this._value as T)) : Result.fail(this._error as E);
  }

  public mapError<F>(fn: (error: E) => F): Result<T, F> {
    return this._isSuccess ? Result.ok(this._value as T) : Result.fail(fn(this._error as E));
  }
}
