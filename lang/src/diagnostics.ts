import type { CrabDiagnostic } from "./transform.ts";

/** `file:line:column: message`, with 1-based line and column. */
export function formatDiagnostic(
	file: string,
	source: string,
	diagnostic: CrabDiagnostic,
): string {
	const lines = source.slice(0, diagnostic.start).split("\n");
	const column = (lines.at(-1)?.length ?? 0) + 1;
	return `${file}:${lines.length}:${column}: ${diagnostic.message} (crabrave${diagnostic.code})`;
}
