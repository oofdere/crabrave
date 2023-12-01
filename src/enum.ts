// enum objects are simply a tuple containing a key and a value which are derived from the enum template E
export type Enum<E> = [keyof E, E[keyof E]]

// same as above, but enforces that the value is a valid type for the key, used in the pack function
export type EnumChecked<E> = { [K in keyof E]: [K, E[K]] }[keyof E]

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Arms<E> = { [K in keyof E]-?: (x: E[K]) => any }

// this is the recommended way to create enum instances so you have strong type checking
export function pack<E>(...entry: EnumChecked<E>): Enum<E> {
	return entry
}

export function match<E, Fn extends Arms<E>>(
	pattern: Enum<E>,
	arms: Fn
): ReturnType<typeof arms[keyof typeof arms]> {
	// biome-ignore lint/suspicious/noExplicitAny: function is safe with the Arms<E> type enforcing the input type.
	return arms[pattern[0]](pattern[1] as any)
}
