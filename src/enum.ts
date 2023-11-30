// extracts the keys and values of the enum
type Keys<E> = keyof E;
type Values<E> = E[keyof E];

// type to mess around with
type Test = {
	str: string,
	num: number,
	nul: null,
	union: string | number,
	opt?: number
}

// same as above, but creates [key, type] objects, which means the types of keys are enforced during type checking
type Enum<E> = {
	[K in keyof E]-?: [K, E[K]];
}[keyof E];

type TestEnum = Enum<Test>

type EnumTypes<E> = {
	[K in keyof E]: E[K]
}[keyof E]

// type to create the matching arms used in the match function
type ArmsExhaustive<E> = {
	// "-?" removes any optional parameters, making all cases required
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[K in keyof E]-?: (x: E[K]) => any
}

// type to create the matching arms used in the match function
type ArmsPartial<E> = {
	// "?" makes all cases optional
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[K in keyof E]?: (x: E[K]) => any
} & {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	defaultCase: (x: EnumTypes<E>) => any
}

export function match<E>(
	pattern: Enum<E>,
	arms: ArmsExhaustive<E>
): ReturnType<ArmsExhaustive<E>[keyof typeof arms]>

export function match<E>(
	pattern: Enum<E>,
	arms: ArmsPartial<E>,
): ReturnType<ArmsExhaustive<E>[keyof typeof arms] | ReturnType<typeof arms.defaultCase> {
	return arms[pattern[0]] ? arms[pattern[0]](pattern[1]) : arms.defaultCase(pattern[1])
}

const a: Enum<Test> = ["str", "string"]
const b: Enum<Test> = ["num", 1]