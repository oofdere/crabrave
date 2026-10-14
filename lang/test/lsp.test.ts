// Editor support: the TypeScript 7.1 language server answers questions about
// .crab files through the content mapper.
import { type ChildProcess, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const file = fileURLToPath(new URL("../examples/colors.crab", import.meta.url));
const uri = pathToFileURL(file).href;

type Message = {
	id?: number;
	method?: string;
	params?: unknown;
	result?: unknown;
};

let server: ChildProcess;
let nextId = 0;
const pending = new Map<number, (message: Message) => void>();

function send(message: object): void {
	const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...message }));
	server.stdin?.write(`Content-Length: ${body.length}\r\n\r\n`);
	server.stdin?.write(body);
}

function request(method: string, params: object): Promise<Message> {
	const id = ++nextId;
	return new Promise((resolve) => {
		pending.set(id, resolve);
		send({ id, method, params });
	});
}

function at(line: number, character: number) {
	return {
		textDocument: { uri },
		position: { line: line - 1, character: character - 1 },
	};
}

beforeAll(async () => {
	server = spawn("node_modules/.bin/tsc", ["--lsp", "--stdio"], { cwd: root });
	let buffer = Buffer.alloc(0);
	server.stdout?.on("data", (chunk: Buffer) => {
		buffer = Buffer.concat([buffer, chunk]);
		for (;;) {
			const header = buffer.indexOf("\r\n\r\n");
			if (header < 0) return;
			const length = Number(
				/Content-Length: (\d+)/i.exec(
					buffer.subarray(0, header).toString(),
				)?.[1],
			);
			if (buffer.length < header + 4 + length) return;
			const message: Message = JSON.parse(
				buffer.subarray(header + 4, header + 4 + length).toString(),
			);
			buffer = buffer.subarray(header + 4 + length);
			if (message.method && message.id !== undefined) {
				// Server-to-client requests (configuration, registrations).
				send({
					id: message.id,
					result: message.method === "workspace/configuration" ? [] : null,
				});
			} else if (message.id !== undefined) {
				pending.get(message.id)?.(message);
				pending.delete(message.id);
			}
		}
	});
	await request("initialize", {
		processId: process.pid,
		rootUri: pathToFileURL(root).href,
		capabilities: {
			textDocument: { hover: { contentFormat: ["plaintext"] }, diagnostic: {} },
		},
		// Content mappers run code from node_modules, so editors must opt in.
		initializationOptions: { runExternalCode: true },
	});
	send({ method: "initialized", params: {} });
	const text = await readFile(file, "utf8");
	send({
		method: "textDocument/didOpen",
		params: { textDocument: { uri, languageId: "crabrave", version: 1, text } },
	});
}, 60_000);

afterAll(() => {
	server?.kill();
});

const hover = async (line: number, character: number) =>
	(
		(await request("textDocument/hover", at(line, character))).result as {
			contents: { value: string };
		} | null
	)?.contents.value;

test(
	"hover shows the type of a match binding",
	{ timeout: 30_000 },
	async () => {
		// `Red(x) => [x, 0, 0],` — the `x` in the pattern.
		expect(await hover(13, 7)).toBe("const x: number");
	},
);

test("hover shows enum constructors", { timeout: 30_000 }, async () => {
	// `export const blue = Color.Blue(128);` — `Color`.
	expect(await hover(20, 22)).toContain(
		"readonly Rgb: (r: number, g: number, b: number) => Color;",
	);
});

test("diagnostics point into the .crab file", { timeout: 30_000 }, async () => {
	const path = fileURLToPath(
		new URL("fixtures/errors/types.crab", import.meta.url),
	);
	const errors = pathToFileURL(path).href;
	send({
		method: "textDocument/didOpen",
		params: {
			textDocument: {
				uri: errors,
				languageId: "crabrave",
				version: 1,
				text: await readFile(path, "utf8"),
			},
		},
	});
	const { result } = await request("textDocument/diagnostic", {
		textDocument: { uri: errors },
	});
	const [first] = (
		result as { items: { range: { start: object }; message: string }[] }
	).items;
	expect(first.range.start).toStrictEqual({ line: 9, character: 8 });
	expect(first.message).toContain("non-exhaustive match: missing Empty");
});

test("go to definition lands on the enum", { timeout: 30_000 }, async () => {
	const { result } = await request("textDocument/definition", at(20, 22));
	expect(result).toStrictEqual([
		{
			uri,
			range: {
				start: { line: 3, character: 12 },
				end: { line: 3, character: 17 },
			},
		},
	]);
});
