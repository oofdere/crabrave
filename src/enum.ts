// enum objects are simply a tuple containing a key and a value which are derived from the enum template E
export type Enum<E> = [keyof E, E[keyof E]]

// same as above, but enforces that the value is a valid type for the key, used in the pack function
export type EnumChecked<E> = { [K in keyof Exclude<E>]: [K, E[K]] }[keyof Exclude<E>]

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
type Arms<E> = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[K in keyof Exclude<E>]-?: (x: E[K]) => any
}

type PartialArms<E, T> = {
	[K in keyof Exclude<E>]?: (x: E[K]) => T
}

// this is the recommended way to create enum instances so you have strong type checking
export const pack = <E>(...entry: EnumChecked<E>): Enum<E> => entry

export const match = <E, Fn extends Arms<E>>(
	pattern: Enum<E>,
	arms: Fn
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
): ReturnType<typeof arms[keyof typeof arms]> => arms[pattern[0]](pattern[1] as any)

export const matchPartial = <E, T>(
	pattern: Enum<E>,
	arms: PartialArms<E, T>,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	fallback: (_: any) => T
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
): T => (arms[pattern[0]] as any || fallback)(pattern[1] as any)


// type to mess around with
type Test = {
	str: string,
	num: number,
	aaa: null
}

// https://stackoverflow.com/a/52473108
type IfEquals<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends
	(<T>() => T extends Y ? 1 : 2) ? true : false;
// keys marked readonly will be excluded from match() (via Exclude<T>). useful for adding utility functions like unwrap().
type Exclude<T> = Pick<T, {
	// mark everything as readonly
	[P in keyof T]: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }> extends true ? P : never
}[keyof T]>

// this extracts the functions to be added to the prototype
type Include<T> = Pick<T, {
	// mark everything as readonly
	[P in keyof T]: IfEquals<{ [Q in P]: T[P] }, { readonly [Q in P]: T[P] }> extends true ? P : never
}[keyof T]>

type TestExclude = Exclude<Test>

const a: Enum<Test> = ["str", "string"]
const b: Enum<Test> = ["aaa", null]
const e = matchPartial(b, { //=>
	str: (x) => x, //=>
	num: (x) => `${x}`, //=>
},
	(_) => "caught!"
) //=>

console.log(e)
// remove readonly to recover the readable properties

