import { Enum } from "./enum";

export type Option<T> = {
	Some: T,
	None: null
}

export const Some = <T>(v: T): Enum<Option<T>> => ["Some", v]
export const None = <T>(_v: T): Enum<Option<T>> => ["None", null]