import { expect, test } from "bun:test";

import { Result, Ok, Err } from "../index";

type Error = number;

test("init_ok", () => {
	const result = Ok<number, Error>(0);
	expect(result.value.status).toBe("ok");
	expect(result.value.data).toBe(0);
});

test("init_err", () => {
	const result = Err<number, Error>(1);
	expect(result.value.status).toBe("err");
	expect(result.value.data).toBe(1);
});

test("unwrap_ok", () => {
	const result = Ok<number, Error>(0);
	expect(result.unwrap()).toBe(0);
});

test("unwrap_err", () => {
	const result = Err<number, Error>(1);
	expect(() => {
		result.unwrap();
	}).toThrow();
});

test("match_ok", () => {
	const result = Ok<number, Error>(0);
	const matched = result.match(
		(data) => data,
		(data) => data,
	);
	expect(matched).toBe(0);
});

test("match_err", () => {
	const result = Err<number, Error>(1);
	const matched = result.match(
		(data) => data,
		(data) => data,
	);
	expect(matched).toBe(1);
});
