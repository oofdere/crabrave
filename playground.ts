// enums are defined as object types, like so:
type Colors = {
	Rgb: [number, number, number];
	Raw: string;
};

// the enum instance type iterates through all keys of the enum, and pulls out the key and type into all possible tuples
type Enum<E> = { [K in keyof E]: [K, E[K]] }[keyof E];

type ColorsEnum = Enum<Colors>;
//   ^?

const red: Enum<Colors> = ["Raw", "#fff"];
const black = ["Rgb", [0, 0, 0]] as Enum<Colors>;

export const pack = <const E>(...entry: Enum<E>) => entry satisfies Enum<E>; //=>

const white = pack<Colors>("Raw", "");

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
type Arms<E> = {
	// biome-ignore lint/suspicious/noExplicitAny: type checking is handled externally
	[K in keyof E]-?: (x: E[K]) => any;
};

type PartialArms<E, T> = {
	[K in keyof E]?: (x: E[K]) => T;
};

export const match = <E, Fn extends Arms<E>>(
	pattern: Enum<E>,
	arms: Fn,
): ReturnType<(typeof arms)[keyof typeof arms]> =>
	// biome-ignore lint/suspicious/noExplicitAny: required
	arms[pattern[0]](pattern[1] as any);

export const matchPartial = <E, T>(
	pattern: Enum<E>,
	arms: PartialArms<E, T>,
	// biome-ignore lint/suspicious/noExplicitAny: laziness, this can get typed with a union of the arm types
	fallback: (x: any) => T,
	// biome-ignore lint/suspicious/noExplicitAny: required
): T => ((arms[pattern[0]] as any) || fallback)(pattern[1] as any);
