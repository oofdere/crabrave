import { describe, expect, test } from "bun:test";
import { Enum, match, pack } from "..";

interface Tests extends Enum {
  Null: null;
  Undefined: undefined;
  Boolean: true;
  Number: number;
  Bigint: bigint;
  String: string;
  Symbol: symbol;
  FixedObject: { key: "value" };
  // biome-ignore lint/complexity/noBannedTypes: for testing
  Object: Object;
  FixedArray: [1, 2, 3];
  Array: Array<number>;
}

const tests = {
  Null: null,
  Undefined: undefined,
  Boolean: true,
  Number: 0,
  Bigint: Number.MAX_SAFE_INTEGER + 1,
  String: "string",
  Symbol: Symbol("symbol"),
  FixedObject: { key: "value" },
  // biome-ignore lint/complexity/noBannedTypes: for testing
  Object: { key: "value" } as Object,
  FixedArray: [1, 2, 3],
  Array: [1, 2, 3] as Array<number>,
};

// packing
describe("packing", () => {
  for (const k in tests) {
    test(k, () => {
      const packed = pack<Tests>(k, tests[k]);
      expect(packed).toStrictEqual({ k, v: tests[k] });
    });
  }
});

// matching
describe("matching", () => {
  let packs: ReturnType<typeof pack<Tests>>[] = [];
  for (const k in tests) {
    test(k, () => {
      packs.push(pack<Tests>(k, tests[k]));
    });
  }

  for (const p of packs) {
    test(p.k, () => {
      match<Tests>(p, {
        Null: (e) => expect(e).toBeNull(),
        Undefined: (e) => expect(e).toBeUndefined(),
        Boolean: (e) => expect(e).toBeTrue(),
        Number: (e) => expect(e).toBe(0),
        Bigint: (e) => expect(e).toBeTypeOf("bigint"),
        String: (e) => expect(e).toBe("string"),
        Symbol: (e) => expect(e).toBe(tests["Symbol"]),
        FixedObject: (e) => expect(e).toBe({ key: "value" }),
        Object: (e) => expect(e).toMatchObject({ key: "value" }),
        FixedArray: (e) => expect(e).toBeArrayOfSize(3),
        Array: (e) => expect(e).toBeArray(),
      });
    });
  }
});
