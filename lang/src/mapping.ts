import {
	DiagnosticDirectivePolicy,
	MappedCodeBuilder,
	type MappedDiagnosticDirective,
	type PositionEncoding,
	SpanMapFeature,
	type TransformResult,
	stringIndexToPosition,
} from "ts-content-mapper";
import type { TransformResult as Compiled } from "./transform.ts";

/** Turn compiler output into what TypeScript expects from a content mapper. */
export function toMappedOutput(
	source: string,
	compiled: Compiled,
	positionEncoding: PositionEncoding,
): TransformResult {
	const builder = new MappedCodeBuilder(source, { positionEncoding });
	const position = (index: number) =>
		stringIndexToPosition(source, index, positionEncoding);
	const directives: MappedDiagnosticDirective[] = [];
	let ignoreFrom = 0;
	let ignoreAt = 0;
	for (const segment of compiled.segments) {
		switch (segment.kind) {
			case "verbatim":
				builder.appendVerbatim(segment.start, segment.end);
				break;
			case "text":
				builder.append(segment.text);
				break;
			case "atom":
				// Atoms exist so diagnostics land somewhere sensible; hovers and
				// friends should come from the verbatim code instead.
				builder.appendAtom(
					segment.text,
					segment.start,
					segment.end,
					SpanMapFeature.None,
				);
				break;
			case "ignore-start":
				ignoreFrom = builder.length;
				ignoreAt = segment.at;
				break;
			case "ignore-end":
				directives.push([
					position(ignoreAt),
					0,
					ignoreFrom,
					builder.length,
					DiagnosticDirectivePolicy.Ignore,
				]);
				break;
		}
	}
	const output = builder.build(".ts", {
		diagnosticDirectives: { unusedExpectDirectiveDiagnostics: [], directives },
	});
	return {
		...output,
		diagnostics: compiled.diagnostics.map((d) => ({
			messageText: d.message,
			start: position(d.start),
			length: position(d.start + d.length) - position(d.start),
			code: d.code,
		})),
	};
}
