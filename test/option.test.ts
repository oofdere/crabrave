import { expect, test } from "bun:test";

import { Option, Some, None, match } from "../index";

test("init_some", () => {
	const option = Some(0);
	expect(option.v).toBe(0);
});

test("init_none", () => {
	const option = None<number>();
	expect(option.v).toBe(void 0);
});

test("unwrap_some", () => {
	const option = Some(0);
	expect(option.unwrap()).toBe(0);
});

test("unwrap_none", () => {
	const option = None<number>();
	expect(() => {
		option.unwrap();
	}).toThrow();
});

test("match_some", () => {
	const option = Some(0);

	match(option, {
		Some: (x) => expect(x).toBe(0),
		None: () => {
			throw 1
		}
	});
});

test("match_none", () => {
	const option = None<number>();

	match(option, {
		Some: (x) => expect().fail(),
		None: () => expect().pass()
	});
});
