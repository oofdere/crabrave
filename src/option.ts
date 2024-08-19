import { match, type Enum } from "./enum";
import "./unwrap";

export type Option<T> = {
	Some: T;
	None: undefined;
};

/**
 * @returns Option<T>
 * @param some
 */
export const Some = <T>(v: T): Option<T> => ["Some", v] as unknown as Option<T>;

/**
 * @returns Creates a None instance of Option<T>
 * @param this Option<T>
 */
export const None = <T>(_v?: T): Option<T> => ["None"] as unknown as Option<T>;
