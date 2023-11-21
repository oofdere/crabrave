type Some<T> = T;

type None = null;

type _Option<T> = Some<T> | None;

export class Option<T> {
  private option: _Option<T>;

  constructor(option: _Option<T>) {
    this.option = option;
  }

  public get value(): Some<T> | None {
    return this.option;
  }

  static some<T>(data: T): Option<T> {
    return new Option(data);
  }

  static none<T>(): Option<T> {
    return new Option<T>(null);
  }

  unwrap(): T {
    if (this.option === null) {
      throw new Error("Failed to unwrap!");
    }
    return this.option;
  }

  match<U, V>(some: (data: T) => U, none: () => V): U | V {
    if (this.option === null) {
      return none();
    } else {
      return some(this.option);
    }
  }
}

export const Some = Option.some;
export const None = Option.none;
