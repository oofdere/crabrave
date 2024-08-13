// enum objects are simply a tuple containing a key and a value which are derived from the enum template E
export type Enum<E> = { [K in keyof E]: [K, E[K]] }[keyof E];

// same as above, but enforces that the value is a valid type for the key, used in the pack function
export type EnumChecked<E> = { [K in keyof E]: [K, E[K]] }[keyof E];

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
export type Arms<E> = {
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
export function pack<E>(...entry: Enum<E>) {
	return entry as E // this is disgusting and we are completely just lying to tsc and the user and it works
}

export function match<E, Fn extends Arms<E>>(
	pattern: E,
	arms: Fn,
): ReturnType<typeof arms[keyof typeof arms]> {
	// ^ typescript ABSOLUTELY FREAKS OUT about this BUT it does work so ¯\_(ツ)_/¯
	// biome-ignore lint/suspicious/noExplicitAny: return type is handled externally
	return ((arms[pattern[0]] as any) || (arms as any)._)(pattern[1] as any) as ReturnType<typeof arms[keyof typeof arms]>;
	// typescript REALLY hates this (hence all the `any`) and I really can't blame it
}

type Color = {
	Red: number;
	Blue: number;
	Green: number;
	Rgb: [number, number, number];
};

const red = pack<Color>("Red", 128) //=> const red: Enum<Colors>
const green = pack<Color>("Green", 128) //=> const green: Enum<Colors>
const blue = pack<Color>("Blue", 128) //=> const blue: Enum<Colors>

function toRGB(color: Color) { // returns number[]
	const a = match(color, {
		Rgb: (x) => x, //=> 
		_: (x) => x //=> 
	}); //=>

	const b = match(color, {
		Red: (x) => [x, 0, 0], //=> 
		Green: (x) => [0, x, 0], //=> 
		Blue: (x) => [0, 0, x], //=> 
		Rgb: (x) => x //=> 
	});
}

console.log(toRGB(blue)); // [ 0, 0, 128 ]