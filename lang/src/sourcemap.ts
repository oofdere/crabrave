import type { Segment } from "./transform.ts";

export interface SourceMap {
	version: 3;
	file?: string;
	sources: string[];
	sourcesContent: string[];
	names: string[];
	mappings: string;
}

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function vlq(value: number): string {
	let rest = value < 0 ? (-value << 1) | 1 : value << 1;
	let encoded = "";
	do {
		let digit = rest & 31;
		rest >>>= 5;
		if (rest > 0) digit |= 32;
		encoded += BASE64[digit];
	} while (rest > 0);
	return encoded;
}

/**
 * A source map from the generated TypeScript back to the `.crab` source.
 * Copied code is mapped token by token; generated code maps to the start of
 * whatever it was generated from.
 */
export function toSourceMap(
	file: string,
	source: string,
	segments: Segment[],
): SourceMap {
	const lineStarts = [0];
	for (let i = 0; i < source.length; i++) {
		if (source[i] === "\n") lineStarts.push(i + 1);
	}
	const locate = (index: number): [number, number] => {
		let low = 0;
		let high = lineStarts.length - 1;
		while (low < high) {
			const mid = (low + high + 1) >> 1;
			if (lineStarts[mid] <= index) low = mid;
			else high = mid - 1;
		}
		return [low, index - lineStarts[low]];
	};

	const lines: string[] = [];
	let line: string[] = [];
	let column = 0;
	let previous = { column: 0, line: 0, sourceColumn: 0 };
	const mark = (index: number) => {
		const [sourceLine, sourceColumn] = locate(index);
		line.push(
			vlq(column - previous.column) +
				vlq(0) +
				vlq(sourceLine - previous.line) +
				vlq(sourceColumn - previous.sourceColumn),
		);
		previous = { column, line: sourceLine, sourceColumn };
	};
	const newline = () => {
		lines.push(line.join(","));
		line = [];
		column = 0;
		previous.column = 0;
	};
	const write = (text: string, origin: number | null) => {
		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			if (char === "\n") {
				newline();
				continue;
			}
			const startsToken =
				origin !== null &&
				!/\s/.test(char) &&
				(i === 0 || /[\s\W]/.test(text[i - 1]) || /\W/.test(char));
			if (startsToken) mark(origin + i);
			column++;
		}
	};

	for (const segment of segments) {
		if (segment.kind === "verbatim") {
			write(source.slice(segment.start, segment.end), segment.start);
		} else if (segment.kind === "atom") {
			if (segment.text.length > 0) mark(segment.start);
			write(segment.text, null);
		} else if (segment.kind === "text") {
			write(segment.text, null);
		}
	}
	lines.push(line.join(","));

	return {
		version: 3,
		file,
		sources: [file],
		sourcesContent: [source],
		names: [],
		mappings: lines.join(";"),
	};
}
