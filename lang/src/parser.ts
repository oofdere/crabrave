import { fileURLToPath } from "node:url";
import { Language, Parser, type Tree } from "web-tree-sitter";

const wasm = fileURLToPath(
	new URL("../grammar/tree-sitter-crabrave.wasm", import.meta.url),
);

let parser: Promise<Parser> | undefined;

async function load(): Promise<Parser> {
	await Parser.init();
	const instance = new Parser();
	instance.setLanguage(await Language.load(wasm));
	return instance;
}

/** Parse crabrave source with the tree-sitter grammar in `grammar/`. */
export async function parse(source: string): Promise<Tree> {
	parser ??= load();
	const tree = (await parser).parse(source);
	if (!tree) throw new Error("tree-sitter failed to parse crabrave source");
	return tree;
}
