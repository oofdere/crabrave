import { Enum } from "./enum";
import "./unwrap";

export type Option<T> = {
	Some: T;
	None: undefined;
};

export const Some = <T>(v: T): Enum<Option<T>> => ["Some", v];
export const None = <T>(_v?: T): Enum<Option<T>> => ["None"] as unknown as Enum<Option<T>>;
