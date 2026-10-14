import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { DiagnosticCode, compile } from "../src/compile.ts";

/** `line:column code` for each diagnostic, 1-based. */
async function diagnose(source: string): Promise<string[]> {
	const { diagnostics } = await compile(source);
	return diagnostics.map((d) => {
		const lines = source.slice(0, d.start).split("\n");
		return `${lines.length}:${(lines.at(-1)?.length ?? 0) + 1} ${d.code}`;
	});
}

/** The generated code, minus the helpers appended after the last line. */
async function body(source: string): Promise<string> {
	const { code } = await compile(source);
	return code.split("\n").slice(0, source.split("\n").length).join("\n");
}

describe("TypeScript passes through untouched", () => {
	test("plain code is copied byte for byte", async () => {
		const source = await readFile(
			new URL("../src/transform.ts", import.meta.url),
			"utf8",
		);
		expect(await body(source)).toBe(source);
	});

	test("`match` and `_` are still identifiers", async () => {
		const source =
			"const match = re.exec(s);\nif (match) match(1, _);\n_.map((_) => _);\n";
		expect(await body(source)).toBe(source);
		expect(await diagnose(source)).toStrictEqual([]);
	});

	test("ternaries and optional syntax are not `?`", async () => {
		const source =
			"const a = b ? c : d;\nconst e = f?.g ?? h;\nfunction i(j?: number) {}\n";
		expect(await body(source)).toBe(source);
	});
});

describe("generated code keeps line numbers", () => {
	const files = [
		"../src/prelude.crab",
		"../examples/colors.crab",
		"../examples/lotto.crab",
		"../examples/percent.crab",
		"./fixtures/runtime/shapes.crab",
		"./fixtures/errors/types.crab",
	];
	for (const file of files) {
		test(file, async () => {
			const source = await readFile(new URL(file, import.meta.url), "utf8");
			const { code } = await compile(source);
			const lines = code.split("\n");
			const original = source.split("\n");
			// Helpers only ever follow the last line.
			expect(lines.length).toBeGreaterThanOrEqual(original.length);
			// Lines that were copied whole stay on the same line number.
			original.forEach((line, i) => {
				if (/^\s*(\/\/|\*|export function|function|import)/.test(line)) {
					expect(lines[i]).toBe(line);
				}
			});
		});
	}
});

describe("enums", () => {
	test("lower to a tuple union and constructors", async () => {
		expect(
			await body(
				"enum Shape { Circle(number), Rect(w: number, h: number), Empty }",
			),
		).toBe(
			'type Shape = | readonly ["Circle", number] | readonly [tag: "Rect", w: number, h: number] | readonly ["Empty"] ;' +
				" const Shape: { readonly Circle: (_0: number) => Shape; readonly Rect: (w: number, h: number) => Shape; readonly Empty: Shape; }" +
				' = { Circle: (_0) => ["Circle", _0], Rect: (w, h) => ["Rect", w, h], Empty: ["Empty"], };',
		);
	});

	test("constructors only take the type parameters they use", async () => {
		const code = await body("export enum Result<T, E> { Ok(T), Err(E) }");
		expect(code).toContain("readonly Ok: <T>(_0: T) => Result<T, never>;");
		expect(code).toContain("readonly Err: <E>(_0: E) => Result<never, E>;");
		expect(code).toMatch(
			/^export type Result<T, E> = .*; export const Result:/,
		);
	});

	test("rest fields", async () => {
		const code = await body("enum Many { Of(...items: string[]) }");
		expect(code).toContain('readonly [tag: "Of", ...items: string[]]');
		expect(code).toContain('Of: (...items) => ["Of", ...items]');
	});
});

describe("match", () => {
	test("statement position uses a labelled block", async () => {
		const code = await body(
			"function f(s) {\n\tmatch s { A(x) => log(x), _ => {} }\n}",
		);
		expect(code).toBe(
			"function f(s) {\n" +
				'\t__crab1: { const __m0 = s; if (__m0[0] === "A") { const x = __m0[1]; log(x); break __crab1; } {  break __crab1; } }\n' +
				"}",
		);
	});

	test("return position returns from each arm", async () => {
		const code = await body("const f = (s) => match s { A(x) => x, B => 0 };");
		expect(code).toBe(
			"const f = (s) => { { const __m0 = s;" +
				' if (__m0[0] === "A") { const x = __m0[1]; return x; }' +
				' if (__m0[0] === "B") { return 0; }' +
				" return __crab_unreachable<typeof __m0>(__m0); } };",
		);
	});

	test("value position hoists the subject", async () => {
		const code = await body("const n = match get() { A(x) => x, _ => 0 };");
		expect(code).toBe(
			'const __m0 = get(); const n = (__m0[0] === "A" ? ((x) => (x))(__m0[1]) : (0));',
		);
	});

	test("comments between arms are kept", async () => {
		const source =
			"const f = (s) => match s {\n\t// @ts-expect-error\n\tA => 1,\n\t_ => 2, // two\n};";
		const code = await body(source);
		expect(code).toContain("// @ts-expect-error\n\tif (");
		expect(code).toContain("// two\n");
		expect(code.split("\n")).toHaveLength(source.split("\n").length);
	});

	test("unreachable arms", async () => {
		expect(
			await diagnose("const n = match x { _ => 1, A => 2 };"),
		).toStrictEqual([`1:29 ${DiagnosticCode.UnreachableArm}`]);
	});

	test("or-patterns must bind the same names", async () => {
		expect(
			await diagnose("const n = match x { A(a) | B(b) => 1, _ => 2 };"),
		).toStrictEqual([`1:21 ${DiagnosticCode.OrPatternBindings}`]);
	});

	test("`return` and `?` in an arm whose value is used", async () => {
		const source = [
			"function f() {",
			"\tconst a = match x { A => { return 1; }, _ => 0 };",
			"\tconst b = match x { A => { const y = load()?; y }, _ => 0 };",
			"}",
		].join("\n");
		expect(await diagnose(source)).toStrictEqual([
			`2:29 ${DiagnosticCode.ReturnInMatchValue}`,
			`3:45 ${DiagnosticCode.TryInMatchValue}`,
		]);
	});

	test("syntax errors in crabrave syntax are reported", async () => {
		expect(await diagnose("const n = match x { A(1) => 2 };")).toStrictEqual([
			`1:23 ${DiagnosticCode.Syntax}`,
		]);
	});
});

describe("?", () => {
	test("is hoisted in front of its statement", async () => {
		expect(await body("function f() {\n\tconst x = load()?;\n}")).toBe(
			"function f() {\n" +
				"\tconst __t0 = load(); if (__crab_residual(__t0)) return __t0; const x = __t0[1];\n" +
				"}",
		);
	});

	test("works inside template literals", async () => {
		expect(
			await diagnose("function f() { return `${load()?}!`; }"),
		).toStrictEqual([]);
	});

	test("grows braces where a statement stands alone", async () => {
		expect(await body("function f() { if (c) return load()?; }")).toBe(
			"function f() { if (c) { const __t0 = load(); if (__crab_residual(__t0)) return __t0; return __t0[1]; } }",
		);
	});

	test("turns concise arrow bodies into blocks", async () => {
		expect(await body("const f = () => load()?;")).toBe(
			"const f = () => { const __t0 = load(); if (__crab_residual(__t0)) return __t0; return __t0[1]; };",
		);
	});

	test("refuses to change what runs, or when", async () => {
		const source = [
			"const top = load()?;",
			"function f() {",
			"\tconst a = cond && load()?;",
			"\tconst b = sideEffect() + load()?;",
			"\twhile (load()?) {}",
			"\tconst c = flag ? load()? : 0;",
			"\tconst d = match x { A => load()?, _ => 0 };",
			"\tconst e = a?.b(load()?);",
			"}",
			"class C { field = load()?; }",
		].join("\n");
		expect(await diagnose(source)).toStrictEqual([
			`1:19 ${DiagnosticCode.TryOutsideFunction}`,
			`3:26 ${DiagnosticCode.TryNotHoistable}`,
			`4:33 ${DiagnosticCode.TryNotHoistable}`,
			`5:15 ${DiagnosticCode.TryNotHoistable}`,
			`6:25 ${DiagnosticCode.TryNotHoistable}`,
			`7:33 ${DiagnosticCode.TryNotHoistable}`,
			`8:23 ${DiagnosticCode.TryNotHoistable}`,
			`10:25 ${DiagnosticCode.TryOutsideFunction}`,
		]);
	});

	test("explains why", async () => {
		const { diagnostics } = await compile(
			"function f() { const b = sideEffect() + load()?; }",
		);
		expect(diagnostics[0].message).toBe(
			"`?` cannot be used here because it would run before `sideEffect()`",
		);
	});
});
