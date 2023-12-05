// this adds the unwrap function to array prototypes

import { Enum } from "./enum";
import { Option } from "./option";
import { Result } from "./result";

declare global {
	interface Array<T> {
		// biome-ignore lint/suspicious/noExplicitAny: function doesn't use E
		unwrap(this: Enum<Option<T>> | Enum<Result<T, any>>): T,
		// biome-ignore lint/suspicious/noExplicitAny: fucntion doesn't use E
		or<E>(this: Enum<Option<T>> | Enum<Result<T, any>>, fallback: E): T,
	}
}

const a = Array.prototype

a.unwrap = function () {
	if (this[0] === "Some" || this[0] === "Ok") {
		return this[1];
	}
	throw TypeError(`${this[0]}(): ${this[1]}`);
};

a.or = function (fallback) {
	if (this[0] === "Some" || this[0] === "Ok") {
		return this[1];
	}
	return fallback;
};
