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
type Enum<E> = [keyof E, E[keyof E]]

type EnumTypes<E> = {
	[K in keyof E]: E[K]
}[keyof E]

// type to create the matching arms used in the match function
type ArmsExhaustive<E> = {
	// "-?" removes any optional parameters, making all cases required
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[K in keyof E]-?: (x: E[K]) => any
}

type TestArms = ArmsExhaustive<Test>

// type to create the matching arms used in the match function
type ArmsPartial<E> = {
	// "?" makes all cases optional
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[K in keyof E]?: (x: E[K]) => any
} & {
	_: (x: any) => any
}

type Arms<E> = ArmsExhaustive<E> | ArmsPartial<E>

type ArmsReturnType<A> = {
	[K in keyof A]-?: K extends (x: any) => infer R ? R : "no";
}[keyof A]

type NoUndef<T> = {
	[K in keyof T]-?: T[K] extends undefined ? never : T[K]
}

const testt: ArmsPartial<Test> = { //=>
	str: (x) => x,
	num: (x) => `${x}`, //=>
}

type TEST3 = ArmsReturnType<typeof testt>

type Peek<T> = T


function match<E>(
	pattern: Enum<E>,
	arms: ArmsExhaustive<E>
): ReturnType<typeof arms[keyof typeof arms]> {
	return arms[pattern[0]](pattern[1])
}

const a: Enum<Test> = ["str", "string"]
const b: Enum<Test> = ["num", 1]

const e = match(b, { //=>
	str: (x) => x, //=>
	num: (x) => `${x}`, //=>
	_: () => "what"
}) //=>