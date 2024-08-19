// this adds the unwrap function to array prototypes
import type { Enum } from "./enum";
import type { Option } from "./option";
import type { Result } from "./result";

declare global {
	interface Object {
		/**
		 * Unwraps the value from a Some or Ok variant.
		 * @template U - The type of the wrapped value
		 * @template E - The type of the error (unused in the function, but needed for type consistency)
		 * @returns {U} The unwrapped value
		 * @throws {TypeError} If the variant is None or Err
		 * @example
		 * const result = Ok(42);
		 * console.log(result.unwrap()); // 42
		 *
		 * const option = Some("hello");
		 * console.log(option.unwrap()); // "hello"
		 */
		// biome-ignore lint/suspicious/noExplicitAny: function doesn't use Err
		unwrap<U, E>(this: Option<U> | Result<U, any>): U;
		/**
		 * Returns the value of Some/Ok, or the fallback value if None/Err.
		 * @template U - The type of the wrapped value
		 * @template E - The type of the fallback value
		 * @param {E} fallback - The value to return if the variant is None or Err
		 * @returns {U | E} The unwrapped value or the fallback
		 * @example
		 * const result = Err("error");
		 * console.log(result.or(0)); // 0
		 *
		 * const option = None();
		 * console.log(option.or("default")); // "default"
		 */
		// biome-ignore lint/suspicious/noExplicitAny: fucntion doesn't use Err
		or<U, E>(this: Option<U> | Result<U, any>, fallback: E): U | E;
	}
}

const a = Array.prototype;

// @ts-expect-error
a.unwrap = function <T, E>(this: Enum<Result<T, E>> | Enum<Option<T>>) {
	if (this[0] === "Some" || this[0] === "Ok") {
		return this[1];
	}
	throw TypeError(`${this[0]}(): ${this[1]}`);
};

// @ts-expect-error
a.or = function <T, E, U>(
	this: Enum<Result<T, E>> | Enum<Option<T>>,
	fallback: U,
) {
	if (this[0] === "Some" || this[0] === "Ok") {
		return this[1];
	}
	return fallback;
};
