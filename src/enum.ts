// enum objects are simply a tuple containing a key and a value which are derived from the enum template E
export type Enum<E> = [keyof E, E[keyof E]];

// same as above, but enforces that the value is a valid type for the key, used in the pack function
export type EnumChecked<E> = { [K in keyof E]: [K, E[K]] }[keyof E];

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
type Arms<E> = {
	// biome-ignore lint/suspicious/noExplicitAny: type checking is handled externally
	[K in keyof E]-?: (x: E[K]) => any;
} | PartialArms<E>

type PartialArms<E> = {
	// biome-ignore lint/suspicious/noExplicitAny: type checking is handled externally
	[L in keyof E]?: (x: E[L]) => any;
} & {
	// biome-ignore lint/suspicious/noExplicitAny: type checking is handled externally
	_: (x: EnumChecked<E>[1]) => any
};

// this is the recommended way to create enum instances so you have strong type checking
export const pack = <E>(...entry: EnumChecked<E>) => entry satisfies EnumChecked<E>;

export const match = <E, Fn extends Arms<E>>(
	pattern: Enum<E>,
	arms: Fn,
) =>
	// biome-ignore lint/suspicious/noExplicitAny: required
	// biome-ignore lint/style/noNonNullAssertion: will never be null when short-circuited
	((arms[pattern[0]] as any) || arms._!)(pattern[1] as any);;
// typescript REALLY hates this and I can't blame it