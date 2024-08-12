import type { Enum } from "./enum";
import "./unwrap";

export type Result<T, E> = {
	Ok: T;
	Err: E;
};

export const Ok = <T, E>(ok: T, _err?: E): Enum<Result<T, E>> => ["Ok", ok];
export const Err = <T, E>(err: E, _ok?: T): Enum<Result<T, E>> => ["Err", err];
