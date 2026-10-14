// The editor queries must compile against the grammar: one invalid node name
// and an editor drops the whole file.
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { Query } from "web-tree-sitter";
import { parse } from "../src/parser.ts";

const editors = fileURLToPath(new URL("../editors/", import.meta.url));

async function queries(dir: string): Promise<string[]> {
	return (await readdir(`${editors}${dir}`))
		.filter((file) => file.endsWith(".scm"))
		.map((file) => `${dir}/${file}`);
}

async function compile(file: string): Promise<Query> {
	const tree = await parse("");
	// Neovim queries extend nvim-treesitter's TypeScript queries, which are
	// not in this repository; check the crabrave part.
	const source = (await readFile(`${editors}${file}`, "utf8")).replace(
		/^; inherits:.*$/m,
		"",
	);
	return new Query(tree.language, source);
}

describe("queries compile", async () => {
	const files = [
		...(await queries("zed/languages/crabrave")),
		...(await queries("helix/runtime/queries/crabrave")),
		...(await queries("nvim/queries/crabrave")),
		"../grammar/queries/highlights.scm",
	];
	for (const file of files) {
		test(file, async () => {
			await expect(compile(file)).resolves.toBeInstanceOf(Query);
		});
	}
});

test("highlights mark crabrave syntax", async () => {
	const source = await readFile(
		new URL("../examples/percent.crab", import.meta.url),
		"utf8",
	);
	const tree = await parse(source);
	const captured = async (file: string) => {
		const query = await compile(file);
		const captures = new Map<string, string>();
		// Later captures win in Zed, Helix and Neovim.
		for (const { name, node } of query.captures(tree.rootNode)) {
			captures.set(`${node.startIndex}:${node.text}`, name);
		}
		return (text: string, occurrence = 0) =>
			[...captures].filter(([key]) => key.endsWith(`:${text}`))[
				occurrence
			]?.[1];
	};

	const zed = await captured("zed/languages/crabrave/highlights.scm");
	expect(zed("match")).toBe("keyword");
	expect(zed("TotalLessThanN")).toBe("variant");
	expect(zed("?")).toBe("operator");

	const helix = await captured("helix/runtime/queries/crabrave/highlights.scm");
	expect(helix("match")).toBe("keyword.control.conditional");
	expect(helix("TotalLessThanN")).toBe("type.enum.variant");

	const nvim = await captured("nvim/queries/crabrave/highlights.scm");
	expect(nvim("match")).toBe("keyword.conditional");
	expect(nvim("TotalLessThanN")).toBe("constant");
});
