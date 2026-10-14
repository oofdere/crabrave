import { parse } from "./parser.ts";
import { type TransformResult, transform } from "./transform.ts";

export type { CrabDiagnostic, Segment, TransformResult } from "./transform.ts";
export { DiagnosticCode } from "./transform.ts";

/** Compile crabrave source to TypeScript. */
export async function compile(source: string): Promise<TransformResult> {
	return transform(source, await parse(source));
}
