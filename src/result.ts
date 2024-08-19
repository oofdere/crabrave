import type { Enum } from "./enum";
import "./unwrap";

/**
 * Represents a result that can be either Ok(T) or Err(E).
 * @template T - The type of the value when the result is Ok
 * @template E - The type of the error when the result is Err
 * @property {T} Ok - The success value
 * @property {E} Err - The error value
 */
export type Result<T, E> = {
	Ok: T;
	Err: E;
};

/**
 * Creates an Ok variant of the Result type, containing a success value.
 * @template T - The type of the success value
 * @template E - The type of the error (unused in Ok, but needed for type consistency)
 * @param {T} ok - The success value to wrap in Ok
 * @param {E} [_err] - Optional parameter, ignored in the implementation
 * @returns {Result<T, E>} A Result containing the success value
 * @example
 * const Result = Ok<number, string>(42);
 * @remarks
 * Generic parameters are required! Make sure they get inferred correctly,
 * or set them manually. DO NOT RELY ON FUNCTION RETURN INFERENCE.
 */
export const Ok = <T, E>(ok: T, _err?: E): Result<T, E> =>
	["Ok", ok] as unknown as Result<T, E>;

/**
 * Creates an Err variant of the Result type, containing an error value.
 * @template T - The type of the success value (unused in Err, but needed for type consistency)
 * @template E - The type of the error
 * @param {E} err - The error value to wrap in Err
 * @param {T} [_ok] - Optional parameter, ignored in the implementation
 * @returns {Result<T, E>} A Result containing the error value
 * @example
 * const errorResult = Err<number, string>("An error occurred");
 * @remarks
 * Generic parameters are required! Make sure they get inferred correctly,
 * or set them manually. DO NOT RELY ON FUNCTION RETURN INFERENCE.
 */
export const Err = <T, E>(err: E, _ok?: T): Result<T, E> =>
	["Err", err] as unknown as Result<T, E>;
