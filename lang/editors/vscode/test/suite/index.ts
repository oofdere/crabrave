// Runs inside VS Code (see ../run.mjs). Opens files from lang/ and checks
// that the language server and the grammar both work on them.
import { strict as assert } from "node:assert";
import { join } from "node:path";
import * as vscode from "vscode";
import type { Api } from "../../src/extension";

const lang = join(__dirname, "..", "..", "..", "..");

async function eventually<T>(
	what: string,
	attempt: () => Promise<T | undefined> | T | undefined,
	timeout = 60_000,
): Promise<T> {
	const deadline = Date.now() + timeout;
	let last: unknown;
	while (Date.now() < deadline) {
		try {
			const value = await attempt();
			if (value !== undefined) return value;
		} catch (error) {
			last = error;
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(`timed out waiting for ${what}${last ? `: ${last}` : ""}`);
}

async function open(file: string): Promise<vscode.TextDocument> {
	const document = await vscode.workspace.openTextDocument(join(lang, file));
	await vscode.window.showTextDocument(document);
	return document;
}

function positionOf(
	document: vscode.TextDocument,
	needle: string,
	offset = 0,
): vscode.Position {
	const index = document.getText().indexOf(needle);
	assert.notEqual(index, -1, `${needle} not found`);
	return document.positionAt(index + offset);
}

function hoverText(hovers: vscode.Hover[]): string {
	return hovers
		.flatMap((hover) => hover.contents)
		.map((content) => (typeof content === "string" ? content : content.value))
		.join("\n");
}

const tests: [string, () => Promise<void>][] = [];
const test = (name: string, body: () => Promise<void>) =>
	tests.push([name, body]);

test(".crab files get the crabrave language", async () => {
	const document = await open("examples/colors.crab");
	assert.equal(document.languageId, "crabrave");
});

test("a language server starts for the project", async () => {
	const extension = vscode.extensions.getExtension<Api>("oofdere.crabrave");
	assert.ok(extension, "extension is installed");
	const api = await extension.activate();
	const document = await open("examples/colors.crab");
	const client = await api.serverFor(document);
	assert.ok(client?.isRunning(), "server is running");
});

test("hover shows the type of a match binding", async () => {
	const document = await open("examples/colors.crab");
	const position = positionOf(document, "Red(x) =>", 4);
	const text = await eventually("hover", async () => {
		const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
			"vscode.executeHoverProvider",
			document.uri,
			position,
		);
		const text = hoverText(hovers);
		return text.includes("x: number") ? text : undefined;
	});
	assert.match(text, /const x: number/);
	const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
		"vscode.executeHoverProvider",
		document.uri,
		position,
	);
	assert.equal(hovers.length, 1, "one hover, not one per registration");
});

test("go to definition jumps to the enum", async () => {
	const document = await open("examples/colors.crab");
	const position = positionOf(document, "Color.Blue(128)", 1);
	const locations = await eventually("definition", async () => {
		const result = await vscode.commands.executeCommand<
			(vscode.Location | vscode.LocationLink)[]
		>("vscode.executeDefinitionProvider", document.uri, position);
		return result.length ? result : undefined;
	});
	const first = locations[0];
	const range =
		"targetRange" in first
			? (first.targetSelectionRange ?? first.targetRange)
			: first.range;
	assert.equal(range.start.line, positionOf(document, "enum Color").line);
});

test("completion lists the variants", async () => {
	const document = await open("examples/colors.crab");
	const position = positionOf(document, "Color.Blue(128)", "Color.".length);
	const labels = await eventually("completion", async () => {
		const list = await vscode.commands.executeCommand<vscode.CompletionList>(
			"vscode.executeCompletionItemProvider",
			document.uri,
			position,
		);
		const labels = list.items.map((item) =>
			typeof item.label === "string" ? item.label : item.label.label,
		);
		return labels.includes("Rgb") ? labels : undefined;
	});
	for (const variant of ["Red", "Green", "Blue", "Rgb"]) {
		assert.equal(
			labels.filter((label) => label === variant).length,
			1,
			`completes ${variant} once`,
		);
	}
});

test("semantic tokens color identifiers", async () => {
	const document = await open("examples/colors.crab");
	const tokens = await eventually("semantic tokens", async () => {
		const tokens = await vscode.commands.executeCommand<
			vscode.SemanticTokens | undefined
		>("vscode.provideDocumentSemanticTokens", document.uri);
		return tokens?.data.length ? tokens : undefined;
	});
	assert.ok(tokens.data.length > 0);
});

test("type errors are reported where they were made", async () => {
	const document = await open("test/fixtures/errors/types.crab");
	const diagnostics = await eventually("diagnostics", () => {
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		return diagnostics.length >= 7 ? diagnostics : undefined;
	});
	// Give a second provider, if there were one, time to add its copy.
	await new Promise((resolve) => setTimeout(resolve, 2000));
	assert.equal(
		vscode.languages.getDiagnostics(document.uri).length,
		7,
		"each error is reported once",
	);
	const missing = diagnostics.find((d) =>
		d.message.includes("non-exhaustive match: missing Empty"),
	);
	assert.ok(missing, "reports the missing arm");
	assert.equal(
		missing.range.start.line,
		positionOf(document, "return match s").line,
	);
	assert.equal(
		diagnostics.filter((d) => d.message.includes("Cannot find name 'Nmber'"))
			.length,
		1,
		"a typo in a field type is reported once",
	);
});

test("the grammar scopes crabrave syntax", async () => {
	const document = await open("examples/percent.crab");
	type Token = { c: string; t: string };
	const tokens = await vscode.commands.executeCommand<Token[]>(
		"_workbench.captureSyntaxTokens",
		document.uri,
	);
	const scope = (text: string) =>
		tokens.find((token) => token.c === text)?.t ?? "";
	assert.match(scope("match"), /keyword\.control\.match\.crab/);
	assert.match(scope("?"), /keyword\.operator\.try\.crab/);
	assert.match(scope("TotalLessThanN"), /variable\.other\.enummember/);
	// TypeScript keeps doing the rest.
	assert.match(scope("function"), /storage\.type\.function\.ts/);
	// A `?` does not open a ternary that swallows the next lines.
	const after = tokens.find((token) => token.c === "high");
	assert.ok(
		after && !/ternary/.test(after.t),
		`no ternary scope after \`?\`: ${after?.t}`,
	);
});

export async function run(): Promise<void> {
	const failures: string[] = [];
	for (const [name, body] of tests) {
		try {
			await body();
			console.log(`  ✓ ${name}`);
		} catch (error) {
			console.log(
				`  ✗ ${name}\n    ${String(error).split("\n").join("\n    ")}`,
			);
			failures.push(name);
		}
	}
	console.log(
		`\n${tests.length - failures.length} passed, ${failures.length} failed`,
	);
	if (failures.length) throw new Error(`${failures.length} test(s) failed`);
}
