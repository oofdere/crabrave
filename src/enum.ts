// enum objects are simply a tuple containing a key and a value which are derived from the enum template E
export type Enum<E> = { [K in keyof E]: [K, E[K]] }[keyof E];

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
export type Arms<E> =
	| {
			[K in keyof E]-?: (x: E[K]) => unknown;
	  }
	| ({
			[L in keyof E]?: (x: E[L]) => unknown;
	  } & {
			_: (x: Enum<E>[1]) => unknown;
	  });

// this is a generic way to create enum instances, but the Enum() factory function is preferred
export const pack = <E>(...e: Enum<E>) => e as E;

export const Enum =
	<E>() =>
	(...e: Enum<E>) =>
		e as unknown as E;

export const match = <E, Fn extends Arms<E>>(pattern: E, arms: Fn) =>
	// biome-ignore lint/suspicious/noExplicitAny: return type is handled externally
	(((arms as any)[(pattern as any[])[0]] as any) || (arms as any)._)(
		(pattern as any)[1] as unknown,
	) as ReturnType<Exclude<(typeof arms)[keyof typeof arms], undefined>>;
