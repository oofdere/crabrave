import { Enum } from "./enum";

export type Result<T, E> = {
	Ok: T,
	Err: E
}

export function Ok<T, E>(ok: T, _err: E): Enum<Result<T, E>> {
	return ["Ok", ok]
}

export function None<T, E>(_ok: T, err: E): Enum<Result<T, E>> {
	return ["Err", err]
}