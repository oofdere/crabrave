import { Enum } from "./enum";

export type OptionEnum<T> = {
	Some: T,
	// biome-ignore lint/suspicious/noConfusingVoidType: makes sense to use here, I think, since it's a type that can never hold a value
	None: void
}

interface Option<T> extends Enum<OptionEnum<T>> {
	unwrap: (this: Option<T>) => T;
}

function unwrap<T>(this: Option<T>) {
	if (this.k === "Some") return this.v as T
	throw TypeError(`Unwrapped an Option that contained None(): ${JSON.stringify(this)}`)
}

export function Some<T>(v: T): Option<T> {
	return {
		k: "Some",
		v,
		unwrap,
	}
}

export function None<T>(_v?: T): Option<T> {
	return {
		k: "None",
		v: void 0,
		unwrap,
	}
}