// extracts the keys and values of the enum
type Keys<E> = keyof E;
type Values<E> = E[keyof E];

// packs the container for entries in the enum
// might be replaced with something else (tuple?) later on
type Pack<K, V> = {
	k: K;
	v: V;
};

// creates a union of all possible types from an enum
export type Enum<E> = Pack<Keys<E>, Values<E>>;

// same as above, but creates [key, type] objects, which means the types of keys are enforced during type checking
type EnumUnion<E> = {
	[K in keyof E]: [K, E[K]];
}[keyof E];

// creates an object type to be used for matching
type Functionify<T> = {
	// biome-ignore lint/suspicious/noExplicitAny: users can use any return value, this is accounted for
	[K in keyof T]: (val: T[K]) => any;
};

// and these two functions are the only things you see in the compiled output
export function pack<E extends object>(...entry: EnumUnion<E>): Enum<E> {
	return { k: entry[0], v: entry[1] };
}

export function match<E, Fn extends Functionify<E>>(
	pattern: Enum<E>,
	arms: Fn,
): ReturnType<typeof arms[keyof typeof arms]> {
	// biome-ignore lint/suspicious/noExplicitAny: function is safe with other guard rails present to prevent values that don't match the function type
	return arms[pattern.k](pattern.v as any);
}
