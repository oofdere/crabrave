import { expect, test } from "bun:test";

import { Option, Some, None } from "../index";

test("init_some", () => {
  const option = Some(0);
  expect(option.value).toBe(0);
});

test("init_none", () => {
  const option = None<Number>();
  expect(option.value).toBe(null);
});

test("unwrap_some", () => {
  const option = Some(0);
  expect(option.unwrap()).toBe(0);
});

test("unwrap_none", () => {
  const option = None<Number>();
  expect(() => {
    option.unwrap();
  }).toThrow();
});

test("match_some", () => {
  const option = Some(0);

  option.match(
    (data) => expect(data).toBe(0),
    () => {
      throw 1;
    }
  );
});

test("match_none", () => {
  const option = None<Number>();

  option.match(
    (data) => {
      throw 1;
    },
    () => 0
  );
});
