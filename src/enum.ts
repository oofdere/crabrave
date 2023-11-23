// biome-ignore lint/complexity/noBannedTypes: type Enum aliases any object, but is still useful to discriminate between random objects and ones intended to be Enums
export type Enum = Object;

// extracts the keys and values of the enum
type Keys<E> = keyof E;
type Values<E> = E[keyof E];

// packs the container for entries in the enum
// might be replaced with something else (tuple?) later on
type Pack<K, V> = {
	k: K;
	v: V;
};

// creates a union of all possible pack types from an enum
type PackUnion<E> = Pack<Keys<E>, Values<E>>;

// same as above, but creates [key, type] objects, which means the types of keys are enforced during type checking
type PackComboUnion<E> = {
	[K in keyof E]: [K, E[K]]; //=>
}[keyof E];

// creates an object type to be used for matching
type Functionify<T, U> = {
	[K in keyof T]: (val: T[K]) => U;
};

// and these two functions are the only things you see in the compiled output
export function pack<E extends Enum>(
	...entry: PackComboUnion<E>
): PackUnion<E> {
	return { k: entry[0], v: entry[1] };
}

export function match<E extends Enum, U>(
	pattern: PackUnion<E>,
	arms: Functionify<E, U>,
): U {
	return arms[pattern.k](pattern.v);
}
