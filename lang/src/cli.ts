#!/usr/bin/env node
// Usage: crabrave <file.crab>  — prints the generated TypeScript.
import { readFile } from "node:fs/promises";
import { compile } from "./compile.ts";
import { formatDiagnostic } from "./diagnostics.ts";

const [file] = process.argv.slice(2);
if (!file) {
	console.error("usage: crabrave <file.crab>");
	process.exit(2);
}
const source = await readFile(file, "utf8");
const { code, diagnostics } = await compile(source);
process.stdout.write(code);
for (const diagnostic of diagnostics) {
	console.error(formatDiagnostic(file, source, diagnostic));
}
if (diagnostics.length) process.exitCode = 1;
