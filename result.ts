type Ok<T> = {
  status: "ok";
  data: T;
};

type Err<E> = {
  status: "err";
  data: E;
};

type _Result<T, E> = Ok<T> | Err<E>;

export class Result<T, E> {
  private result: _Result<T, E>;

  constructor(result: _Result<T, E>) {
    this.result = result;
  }

  public get value(): Ok<T> | Err<E> {
    return this.result;
  }

  static ok<T, E>(data: T): Result<T, E> {
    return new Result<T, E>({ status: "ok", data });
  }

  static err<T, E>(data: E): Result<T, E> {
    return new Result<T, E>({ status: "err", data });
  }

  unwrap(): T {
    if (this.result.status === "err") {
      throw this.result.data;
    }
    return this.result.data;
  }
}
