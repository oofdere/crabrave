import { expect, test } from "bun:test";

import { Option } from "../index";

test("init_some", () => {
  const option = Option.some<Number>(0);
  expect(option.value).toBe(0);
});

test("init_none", () => {
  const option = Option.none<Number>();
  expect(option.value).toBe(null);
});

test("match_some", () => {
  const option = Option.some<Number>(0);

  option.match(
    (data) => {
      expect(data).toBe(0);
    },
    () => {
      throw 1;
    }
  );
});

test("match_none", () => {
  const option = Option.none<Number>();

  option.match(
    (data) => {
      throw 1;
    },
    () => {
      return 0;
    }
  );
});
