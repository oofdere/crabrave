// enum objects are simply a tuple containing a key and a value which are derived from the enum template E
export type Enum<E> = [keyof E, E[keyof E]];

// same as above, but enforces that the value is a valid type for the key, used in the pack function
export type EnumChecked<E> = { [K in keyof E]: [K, E[K]] }[keyof E];

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
type Arms<E> = {
	// biome-ignore lint/suspicious/noExplicitAny: type checking is handled externally
	[K in keyof E]-?: (x: E[K]) => any;
};

type PartialArms<E, T> = {
	[K in keyof E]?: (x: E[K]) => T;
};

// this is the recommended way to create enum instances so you have strong type checking
export const pack = <E>(...entry: EnumChecked<E>): Enum<E> => entry as Enum<E>;

export const match = <E, Fn extends Arms<E>>(
	pattern: Enum<E>,
	arms: Fn,
	// biome-ignore lint/suspicious/noExplicitAny: required
): ReturnType<typeof arms[keyof typeof arms]> =>
	arms[pattern[0]](pattern[1] as any);

export const matchPartial = <E, T>(
	pattern: Enum<E>,
	arms: PartialArms<E, T>,
	// biome-ignore lint/suspicious/noExplicitAny: laziness, this can get typed with a union of the arm types
	fallback: (x: any) => T,
	// biome-ignore lint/suspicious/noExplicitAny: required
): T => ((arms[pattern[0]] as any) || fallback)(pattern[1] as any);
