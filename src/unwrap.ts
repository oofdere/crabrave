// this adds the unwrap function to array prototypes

import { Enum } from "./enum";
import { Option } from "./option";
import { Result } from "./result";

declare global {
	interface Array<T> {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		unwrap(this: Enum<Option<T>> | Enum<Result<T, any>>): T;
	}
}

Array.prototype.unwrap = function () {
	if (this[0] === "Some" || this[0] === "Ok") {
		return this[1];
	}
	throw TypeError(`${this[0]}(): ${this[1]}`);
};
