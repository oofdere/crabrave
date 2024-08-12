import { describe, expect, test } from "bun:test";
import { type Enum, match, pack, type EnumChecked } from "..";

type Tests = {
	Null: null;
	Undefined: undefined;
	Boolean: true;
	Number: number;
	BigInt: bigint;
	String: string;
	Symbol: symbol;
	FixedObject: { key: "value" };
	// biome-ignore lint/complexity/noBannedTypes: for testing
	Object: Object;
	FixedArray: [1, 2, 3];
	Array: Array<number>;
};

const tests = {
	Null: null,
	Undefined: undefined,
	Boolean: true,
	Number: 0,
	BigInt: Number.MAX_SAFE_INTEGER + 1,
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
			expect(packed).toStrictEqual([k, tests[k]]);
		});
	}
});

// matching
describe("matching", () => {
	const packs: Enum<Tests>[] = [];
	for (const k in tests) {
		test(k, () => packs.push(pack<Tests>(k, tests[k])));
	}

	for (const p of packs) {
		test(p[0], () => {
			match(p, {
				Null: (e) => expect(e).toBeNull(), //=>
				Undefined: (e) => expect(e).toBeUndefined(), //=>
				Boolean: (e) => expect(e).toBeTrue(), //=>
				Number: (e) => expect(e).toBe(0), //=>
				BigInt: (e) => expect(e).toBeTypeOf("bigint"), //=>
				String: (e) => expect(e).toBe("string"), //=>
				Symbol: (e) => expect(e).toBe(tests.Symbol), //=>
				FixedObject: (e) => expect(e).toBe({ key: "value" }), //=>
				Object: (e) => expect(e).toMatchObject({ key: "value" }), //=>
				FixedArray: (e) => expect(e).toBeArrayOfSize(3), //=>
				Array: (e) => expect(e).toBeArray(), //=>
			});
			expect().fail()
		});
	}

	describe("partial", () => {
		for (const k in tests) {
			test(k, () => packs.push(pack<Tests>(k, tests[k])));
		}

		for (const p of packs) {
			test(p[0], () => {
				match(p, { _: () => expect().pass() });
				expect().fail()
			});
		}
	})
});
