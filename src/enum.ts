// enum objects are simply a tuple containing a key and a value which are derived from the enum template E
export type Enum<E> = { [K in keyof E]: [K, E[K]] }[keyof E];

// same as above, but enforces that the value is a valid type for the key, used in the pack function
export type EnumChecked<E> = { [K in keyof E]: [K, E[K]] }[keyof E];

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
export type Arms<E> =
	| {
			[K in keyof E]-?: (x: E[K]) => unknown;
	  }
	| ({
			[L in keyof E]?: (x: E[L]) => unknown;
	  } & {
			_: (x: EnumChecked<E>[1]) => unknown;
	  });

// this is a generic way to create enum instances, but the Enum() factory function is preferred
export const pack = <E>(...entry: Enum<E>) => entry as E; // this is disgusting and we are completely just lying to tsc and the user and it works

export const Enum =
	<E>() =>
	(...entry: Enum<E>) =>
		entry as unknown as E;

export const match = <E, Fn extends Arms<E>>(pattern: E, arms: Fn) =>
	// ^ typescript ABSOLUTELY FREAKS OUT about this BUT it does work so ¯\_(ツ)_/¯
	// biome-ignore lint/suspicious/noExplicitAny: return type is handled externally
	((arms[pattern[0]] as any) || (arms as any)._)(
		pattern[1] as unknown,
	) as ReturnType<(typeof arms)[keyof typeof arms]>;
// typescript REALLY hates this (hence all the `any`) and I really can't blame it
