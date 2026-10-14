import { expect, describe as group, test } from "vitest";
import {
	Err,
	None,
	Ok,
	Some,
	map,
	unwrap,
	unwrapOr,
} from "../src/prelude.crab";
import * as shapes from "./fixtures/runtime/shapes.crab";

const { Shape, Tree } = shapes;

group("enums", () => {
	test("variants are packed tuples", () => {
		expect(Shape.Circle(1)).toStrictEqual(["Circle", 1]);
		expect(Shape.Rect(2, 3)).toStrictEqual(["Rect", 2, 3]);
		expect(Shape.Empty).toStrictEqual(["Empty"]);
		expect(Tree.Leaf("x")).toStrictEqual(["Leaf", "x"]);
	});

	test("the layout matches crabrave 1.x", () => {
		expect(Some(1)).toStrictEqual(["Some", 1]);
		expect(None).toStrictEqual(["None"]);
		expect(Ok(1)).toStrictEqual(["Ok", 1]);
		expect(Err("e")).toStrictEqual(["Err", "e"]);
	});
});

group("match", () => {
	test("in return position", () => {
		expect(shapes.area(Shape.Rect(2, 3))).toBe(6);
		expect(shapes.area(Shape.Circle(1))).toBeCloseTo(Math.PI);
		expect(shapes.area(Shape.Empty)).toBe(0);
	});

	test("guards fall through to later arms", () => {
		expect(shapes.describe(Shape.Circle(11))).toBe("big circle");
		expect(shapes.describe(Shape.Circle(1))).toBe("circle");
		expect(shapes.describe(Shape.Rect(2, 2))).toBe("square");
		expect(shapes.describe(Shape.Rect(2, 3))).toBe("something else");
		expect(shapes.describe(Shape.Empty)).toBe("something else");
	});

	test("in value position", () => {
		expect(shapes.both(Shape.Circle(1), Shape.Rect(2, 3))).toBe(
			"circle 1 & 2x3",
		);
		expect(shapes.both(Shape.Empty, Shape.Empty)).toBe(
			"not a circle & not a rect",
		);
	});

	test("in statement position, with break and continue", () => {
		const counts = shapes.tally([
			Shape.Circle(1),
			Shape.Rect(-1, 1),
			Shape.Rect(1, 1),
			Shape.Empty,
			Shape.Empty,
			Shape.Circle(2),
		]);
		expect(counts).toStrictEqual({ circles: 1, rects: 1, empties: 2 });
	});

	test("block arms evaluate to their tail expression", () => {
		expect(shapes.sizeClass(Shape.Circle(6))).toBe("large");
		expect(shapes.sizeClass(Shape.Circle(1))).toBe("small");
		expect(shapes.sizeClass(Shape.Empty)).toBe("n/a");
	});

	test("literal patterns", () => {
		expect([200, 201, 404, 500].map(shapes.status)).toStrictEqual([
			"ok",
			"ok",
			"missing",
			"error",
		]);
	});

	test("recursive enums", () => {
		expect(shapes.sum(shapes.tree)).toBe(6);
	});

	test("subjects that cannot be hoisted are only evaluated when reached", () => {
		let calls = 0;
		const make = () => {
			calls++;
			return Shape.Circle(1);
		};
		expect(shapes.lazy(false, make)).toBe("skipped");
		expect(calls).toBe(0);
		expect(shapes.lazy(true, make)).toBe("made a circle");
		expect(calls).toBe(1);
	});

	test("generated code keeps line numbers", () => {
		const error = (() => {
			try {
				shapes.boom(Shape.Empty);
			} catch (e) {
				return e as Error;
			}
		})();
		// `throw new Error("boom")` is on line 119, column 10, of shapes.crab.
		expect(error?.stack).toContain("shapes.crab:119:10");
	});

	test("source maps account for hoisted code", () => {
		expect(shapes.explode("x")).toStrictEqual(["Err", "not a number: x"]);
		const error = (() => {
			try {
				shapes.explode("-1");
			} catch (e) {
				return e as Error;
			}
		})();
		expect(error).toBeInstanceOf(RangeError);
		// `mustBePositive(` is on line 126, column 16.
		expect(error?.stack).toContain("shapes.crab:126:16");
	});
});

group("?", () => {
	test("unwraps Ok and returns Err early", () => {
		expect(shapes.add("1", "2")).toStrictEqual(["Ok", 3]);
		expect(shapes.add("x", "2")).toStrictEqual(["Err", "not a number: x"]);
		expect(shapes.add("1", "y")).toStrictEqual(["Err", "not a number: y"]);
	});

	test("unwraps Some and returns None early", () => {
		expect(shapes.firstTwice([[2]])).toStrictEqual(["Some", 4]);
		expect(shapes.firstTwice([])).toStrictEqual(["None"]);
		expect(shapes.firstTwice([[]])).toStrictEqual(["None"]);
	});

	test("applies to the awaited value", async () => {
		const values = [Ok(1), Ok(2)];
		expect(
			await shapes.fetchTwice(async () => values.shift() ?? Err("empty")),
		).toStrictEqual(["Ok", 3]);
		const failing = [Ok(1), Err("nope")];
		expect(
			await shapes.fetchTwice(async () => failing.shift() ?? Err("empty")),
		).toStrictEqual(["Err", "nope"]);
	});
});

group("prelude", () => {
	test("unwrap", () => {
		expect(unwrap(Some(1))).toBe(1);
		expect(unwrap(Ok("a"))).toBe("a");
		expect(() => unwrap(None)).toThrow(TypeError);
		expect(() => unwrap(Err(new RangeError("bad")))).toThrow(RangeError);
	});

	test("unwrapOr", () => {
		expect(unwrapOr(Some(1), 2)).toBe(1);
		expect(unwrapOr(None, 2)).toBe(2);
		expect(unwrapOr(Err("e"), 2)).toBe(2);
	});

	test("map", () => {
		expect(map(Some(2), (x) => x * 2)).toStrictEqual(["Some", 4]);
		expect(map(Ok(2), (x) => `${x}`)).toStrictEqual(["Ok", "2"]);
		expect(map(Err("e"), (x: number) => x)).toStrictEqual(["Err", "e"]);
	});
});
