import { expect, test } from "bun:test";

import { Result } from "../index";

type Err = 0;

test("init_ok", () => {
  const result = Result.ok<Number, Err>(0);
  expect(result.value.status).toBe("ok");
  expect(result.value.data).toBe(0);
});

test("init_err", () => {
  const result = Result.err<Number, Err>(0);
  expect(result.value.status).toBe("err");
  expect(result.value.data).toBe(0);
});

test("unwrap_ok", () => {
  const result = Result.ok<Number, Err>(0);
  expect(result.unwrap()).toBe(0);
});

test("unwrap_err", () => {
  const result = Result.err<Number, Err>(0);
  expect(() => {
    result.unwrap();
  }).toThrow();
});
