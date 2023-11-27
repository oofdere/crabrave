import { Enum, match } from "./enum";

export type ResultEnum<T, E> = {
	Ok: T;
	Err: E;
}


interface Result extends Enum<ResultEnum<T, E>> {
	unwrap: (this: Result<T, E>) => T;
}

type Ok<T> = {
	status: "ok";
	data: T;
};

type Err<E> = {
	status: "err";
	data: E;
};

type _Result<T, E> = Ok<T> | Err<E>;

export class Result<T, E> implements Enum<ResultEnum<T, E>> {
	private result: Enum<ResultEnum<T, E>>;

	constructor(result: _Result<T, E>) {
		this.result = result;
	}

	public get value(): Ok<T> | Err<E> {
		return this.result;
	}

	static Ok<T, E>(v: T, _z?: E): Result<T, E> {
		return new Result({
			k: "Ok",
			v,
		})
	}

	static Err<T, E>(v: E, _z?: T): Result<T, E> {
		return {
			k: "Err",
			v,
		}
	}

	unwrap(): T {
		if (this.k === "Ok") return this.v as T
		throw TypeError(`Unwrapped an Err(): ${this.v}`)
	}

	match<U, V>(ok: (data: T) => U, err: (data: E) => V): U | V {
		if (this.result.status === "err") {
			return err(this.result.data);
		} else {
			return ok(this.result.data);
		}
	}
}

export const Ok = Result.ok;
export const Err = Result.err;

const ok = Ok("yay", 1)

match(ok, {
	Ok: (x) => { }, //=>
	Err: (x) => { } //=>
})

const err: Result<number, number> = Err(1) //=>
const err2: Enum<ResultEnum<number, number>> = Err(1) //=>

console.log(err)

match(err, { //=>
	Ok: (x) => x, //=>
	Err: (x) => console.log(x) //=>
})

