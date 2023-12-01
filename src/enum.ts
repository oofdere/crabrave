// enum objects are simply a tuple containing a key and a value which are derived from the enum template E
export type Enum<E> = [keyof E, E[keyof E]]

// same as above, but enforces that the value is a valid type for the key, used in the pack function
export type EnumChecked<E> = { [K in keyof E]: [K, E[K]] }[keyof E]

// type to create the matching arms used in the match function
// "-?" removes any optional parameters, making all cases required
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Arms<E> = { [K in keyof E]-?: (x: E[K]) => any }

// this is the recommended way to create enum instances so you have strong type checking
export const pack = <E>(...entry: EnumChecked<E>): Enum<E> => entry

export const match = <E, Fn extends Arms<E>>(
	pattern: Enum<E>,
	arms: Fn
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
): ReturnType<typeof arms[keyof typeof arms]> => arms[pattern[0]](pattern[1] as any)
