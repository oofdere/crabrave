import { type Plugin, transformWithOxc } from "vite";
import { compile } from "./compile.ts";
import { formatDiagnostic } from "./diagnostics.ts";
import { toSourceMap } from "./sourcemap.ts";

/** Vite (and Vitest) plugin that compiles `.crab` modules. */
export default function crabrave(): Plugin {
	return {
		name: "crabrave",
		enforce: "pre",
		async transform(source, id) {
			const [file] = id.split("?");
			if (!file.endsWith(".crab")) return null;
			const { code, segments, diagnostics } = await compile(source);
			if (diagnostics.length > 0) {
				this.error(formatDiagnostic(file, source, diagnostics[0]));
			}
			const result = await transformWithOxc(
				code,
				file,
				{ lang: "ts", sourcemap: true },
				toSourceMap(file, source, segments),
			);
			return { code: result.code, map: result.map };
		},
	};
}
