import { Enum, match } from "./enum";

export type ResultEnum<T, E> = {
	Ok: T;
	Err: E;
}


interface Result<T, E> extends Enum<ResultEnum<T, E>> {
	unwrap: (this: Result<T, E>) => T;
}

function unwrap<T, E>(this: Result<T, E>) {
	if (this.k === "Ok") return this.v as T
	throw TypeError(`Unwrapped an Err(): ${this.v}`)
}

export function Ok<T, E>(v: T, _z?: E): Result<T, E> {
	return {
		k: "Ok",
		v,
		unwrap,
	}
}

export function Err<T, E>(v: E, _z?: T): Result<T, E> {
	return {
		k: "Err",
		v,
		unwrap,
	}
}

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
	Err: (x) => x //=>
})

