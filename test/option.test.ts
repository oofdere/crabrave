import { expect, test } from "bun:test";

import { Some, None, match } from "../index";

test("init_some", () => {
	const option = Some(0);
	expect(option[0]).toBe("Some");
	expect(option[1]).toBe(0);
});

test("init_none", () => {
	const option = None<number>();
	expect(option[1]).toBe(null);
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

test("unwrapOr_some", () => {
	const option = Some(0);
	expect(option.unwrapOr(1)).toBe(0);
});

test("unwrapOr_none", () => {
	const option = None<number>();
	expect(option.unwrapOr(1)).toBe(1);

});

test("match_some", () => {
	const option = Some(0);

	match(option, {
		Some: (x) => expect(x).toBe(0), //=>
		None: (x) => { //=>
			throw 1
		}
	});
});

test("match_none", () => {
	const option = None<number>();

	match(option, {
		Some: (x) => expect().fail(), // =>
		None: () => expect().pass() //=>
	});
});
