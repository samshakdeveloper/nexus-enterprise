export abstract class ValueObject<T extends Record<string, unknown>> {
  protected readonly props: T;

  protected constructor(props: T) {
    // تضمین Immutability بدون الگوی پیچیده
    this.props = Object.freeze({ ...props });
  }

  // مقایسه مستقیم بر اساس ارزش (Value Equality)
  public equals(other?: ValueObject<T>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;

    const keys = Object.keys(this.props) as Array<keyof T>;

    return keys.every((key) => this.props[key] === other.props[key]);
  }
}
