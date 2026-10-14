#!/usr/bin/env node
/**
 * TypeScript 7.1 content mapper for `.crab` files.
 *
 * TypeScript starts this process (see `typescript.contentMapper` in
 * package.json) when a project lists it under `contentMappers` and runs with
 * `--runExternalCode`, then asks it over JSON-RPC to turn each `.crab` file
 * into TypeScript plus a source mapping.
 */
import { runContentMapper } from "ts-content-mapper";
import { compile } from "./compile.ts";
import { toMappedOutput } from "./mapping.ts";

runContentMapper({
	diagnosticSource: "crabrave",
	async transform(params, context) {
		const compiled = await compile(params.content);
		return toMappedOutput(params.content, compiled, context.positionEncoding);
	},
});
