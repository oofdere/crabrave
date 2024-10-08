import { assert, expect, test } from "vitest";

import { Ok, Err, match } from "../index";

type Error = 1;

test("init_ok", () => {
	const result = Ok<number, number>(0);
	expect(result[0]).toBe("Ok");
	expect(result[1]).toBe(0);
});

test("init_err", () => {
	const result = Err<number, number>(1);
	expect(result[0]).toBe("Err");
	expect(result[1]).toBe(1);
});

test("unwrap_ok", () => {
	const result = Ok<number, number>(0);
	expect(result.unwrap()).toBe(0);
});

test("unwrap_err", () => {
	const result = Err<number, number>(1);
	expect(() => {
		result.unwrap();
	}).toThrow();
});

test("unwrapOr_ok", () => {
	const result = Ok<number, number>(0);
	expect(result.or(1)).toBe(0);
});

test("unwrapOr_err", () => {
	const result = Err<number, number>(2);
	expect(result.or(1)).toBe(1);
});

test("match_ok", () => {
	const result = Ok<number, number>(0);
	match(result, {
		Ok: (x) => expect(x).toBe(0), //=>
		Err: (x) => expect().fail(), //=>
	});
});

test("match_err", () => {
	const result = Err<number, number>(1);
	match(result, {
		Ok: (x) => assert.fail(), //=>
		Err: (x) => expect(x).toBe(1), //=>
	});
});
