// this adds the unwrap function to array prototypes

import type { Enum } from "./enum";
import type { Option } from "./option";
import type { Result } from "./result";

declare global {
	interface Array<T> {
		// biome-ignore lint/suspicious/noExplicitAny: function doesn't use E
		unwrap<U>(this: Enum<Option<U>> | Enum<Result<U, any>>): U,
		// biome-ignore lint/suspicious/noExplicitAny: fucntion doesn't use E
		or<U, E>(this: Enum<Option<U>> | Enum<Result<U, any>>, fallback: E): U | E,
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
