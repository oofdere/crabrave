import type { BunPlugin } from "bun";
import { compile } from "./compile.ts";
import { formatDiagnostic } from "./diagnostics.ts";

/** Bun plugin that compiles `.crab` modules. Register it with `Bun.plugin()`. */
export const crabrave: BunPlugin = {
	name: "crabrave",
	setup(build) {
		build.onLoad({ filter: /\.crab$/ }, async ({ path }) => {
			const source = await Bun.file(path).text();
			const { code, diagnostics } = await compile(source);
			if (diagnostics.length > 0) {
				throw new SyntaxError(formatDiagnostic(path, source, diagnostics[0]));
			}
			return { contents: code, loader: "ts" };
		});
	},
};

export default crabrave;
