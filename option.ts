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

  match<U, V>(some: (data: T) => U, none: () => V): void {
    if (this.option === null) {
      none();
    } else {
      some(this.option);
    }
  }
}
