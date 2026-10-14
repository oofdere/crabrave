// End to end: TypeScript 7.1 type checks .crab files through the content mapper.
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const run = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));

async function tsc(
	project: string,
): Promise<{ code: number; lines: string[] }> {
	try {
		await run(
			"node_modules/.bin/tsc",
			["-p", project, "--runExternalCode", "--pretty", "false"],
			{
				cwd: root,
			},
		);
		return { code: 0, lines: [] };
	} catch (error) {
		const { code, stdout } = error as { code: number; stdout: string };
		return {
			code,
			lines: stdout.split("\n").filter((line) => /\(\d+,\d+\)/.test(line)),
		};
	}
}

test("the examples type check", { timeout: 60_000 }, async () => {
	expect(await tsc("examples")).toStrictEqual({ code: 0, lines: [] });
});

test(
	"mistakes are reported where they were made",
	{ timeout: 60_000 },
	async () => {
		const { lines } = await tsc("test/fixtures");
		expect(lines).toStrictEqual([
			// A missing arm is reported on `match`, naming the variant.
			`test/fixtures/errors/types.crab(10,9): error TS2345: Argument of type 'readonly ["Empty"]' is not assignable to parameter of type '"non-exhaustive match: missing Empty"'.`,
			// A pattern for a variant that does not exist.
			`test/fixtures/errors/types.crab(18,2): error TS2367: This comparison appears to be unintentional because the types '"Empty" | "Rect"' and '"Rectangle"' have no overlap.`,
			// Binding more fields than the variant has.
			`test/fixtures/errors/types.crab(24,13): error TS2493: Tuple type 'readonly ["Circle", number]' of length '2' has no element at index '2'.`,
			// Constructors are ordinary, checked functions.
			"test/fixtures/errors/types.crab(29,43): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
			"test/fixtures/errors/types.crab(30,33): error TS2554: Expected 1 arguments, but got 0.",
			// `?` in a function that cannot return the error.
			`test/fixtures/errors/types.crab(37,19): error TS2322: Type 'readonly ["Err", string]' is not assignable to type 'number'.`,
			// A mistake in a field type is reported once, even though the
			// constructor signature repeats the type.
			"test/fixtures/errors/types.crab(41,15): error TS2552: Cannot find name 'Nmber'. Did you mean 'Number'?",
		]);
	},
);
