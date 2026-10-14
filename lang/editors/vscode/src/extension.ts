/**
 * Runs the TypeScript 7.1 language server for `.crab` files.
 *
 * TypeScript itself understands `.crab` files through the crabrave content
 * mapper listed in the project's tsconfig.json, so all this extension has to
 * do is start the project's own `tsc --lsp` with `runExternalCode` enabled.
 * Each project (a folder with TypeScript 7.1 in its node_modules) gets its own
 * server, so monorepos and nested packages work.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import {
	type ExtensionContext,
	type LogOutputChannel,
	type TextDocument,
	Uri,
	commands,
	window,
	workspace,
} from "vscode";
import {
	type DocumentSelector,
	LanguageClient,
	type LanguageClientOptions,
	type RegistrationParams,
	type ServerOptions,
} from "vscode-languageclient/node";

/** The `typescript` package a server runs from. */
export interface TypeScriptPackage {
	/** Folder containing the package's package.json. */
	path: string;
	version: string;
	/** The native `tsc` executable. */
	executable: string;
	/** The project the server serves: the folder containing `node_modules`. */
	project: string;
}

const clients = new Map<string, LanguageClient>();
const failures = new Set<string>();
let output: LogOutputChannel;

export async function activate(context: ExtensionContext): Promise<Api> {
	output = window.createOutputChannel("crabrave", { log: true });
	context.subscriptions.push(
		output,
		commands.registerCommand("crabrave.restartServer", restart),
		commands.registerCommand("crabrave.showOutput", () => output.show()),
		workspace.onDidOpenTextDocument(ensureServer),
		workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration("crabrave")) void restart();
		}),
		workspace.onDidGrantWorkspaceTrust(() => void restart()),
	);
	await Promise.all(workspace.textDocuments.map(ensureServer));
	return { serverFor, projects: () => [...clients.keys()] };
}

export async function deactivate(): Promise<void> {
	await stopAll();
}

/** What the extension exposes to other extensions (and its tests). */
export interface Api {
	serverFor(document: TextDocument): Promise<LanguageClient | undefined>;
	/** The projects that currently have a language server. */
	projects(): string[];
}

async function serverFor(
	document: TextDocument,
): Promise<LanguageClient | undefined> {
	await ensureServer(document);
	const typescript = findTypeScript(document.uri);
	return typescript && clients.get(typescript.project);
}

async function ensureServer(document: TextDocument): Promise<void> {
	if (document.languageId !== "crabrave" || document.uri.scheme !== "file") {
		return;
	}
	if (!workspace.isTrusted) return;
	const typescript = findTypeScript(document.uri);
	if (!typescript) {
		const key = dirname(document.uri.fsPath);
		if (!failures.has(key)) {
			failures.add(key);
			void window.showErrorMessage(
				"crabrave needs TypeScript 7.1 or later in this project: run `npm install -D typescript@next`, or set `crabrave.typescript.path`.",
			);
		}
		return;
	}
	if (clients.has(typescript.project)) return;
	const client = createClient(typescript);
	clients.set(typescript.project, client);
	try {
		await client.start();
	} catch (error) {
		clients.delete(typescript.project);
		output.error(`Failed to start the language server: ${error}`);
		throw error;
	}
}

function createClient(typescript: TypeScriptPackage): LanguageClient {
	const configuration = workspace.getConfiguration("crabrave");
	const pattern = `${typescript.project.split(sep).join("/")}/**/*`;
	const languages = ["crabrave"];
	if (configuration.get<boolean>("typescriptFiles")) {
		languages.push(
			"typescript",
			"typescriptreact",
			"javascript",
			"javascriptreact",
		);
	}
	const documentSelector: DocumentSelector = languages.map((language) => ({
		scheme: "file",
		language,
		pattern,
	}));

	output.info(
		`Starting TypeScript ${typescript.version} for ${typescript.project}`,
	);
	const serverOptions: ServerOptions = {
		command: typescript.executable,
		args: ["--lsp", "--stdio"],
		options: { cwd: typescript.project },
	};
	const clientOptions: LanguageClientOptions = {
		documentSelector,
		// Content mappers run code from node_modules, so TypeScript only loads
		// them when asked. The extension only runs in trusted workspaces.
		initializationOptions: { runExternalCode: true },
		workspaceFolder: workspace.getWorkspaceFolder(Uri.file(typescript.project)),
		outputChannel: output,
		traceOutputChannel: output,
	};
	return new CrabraveClient(
		"crabrave",
		`crabrave (${relative(workspace.workspaceFolders?.[0]?.uri.fsPath ?? "", typescript.project) || "."})`,
		serverOptions,
		clientOptions,
	);
}

/**
 * Once a project with content mappers is loaded, TypeScript registers every
 * language feature again for all `.crab` files, so that a client that only
 * knows about TypeScript still serves them. This client already serves them
 * (scoped to its project), so those registrations would show every hover,
 * completion and diagnostic twice.
 */
class CrabraveClient extends LanguageClient {
	constructor(...args: ConstructorParameters<typeof LanguageClient>) {
		super(...args);
		const client = this as unknown as {
			handleRegistrationRequest(params: RegistrationParams): Promise<void>;
		};
		const register = client.handleRegistrationRequest.bind(this);
		client.handleRegistrationRequest = (params) =>
			register({
				registrations: params.registrations.filter(
					(registration) => !onlyCrabFiles(registration.registerOptions),
				),
			});
	}
}

function onlyCrabFiles(options: unknown): boolean {
	const selector = (options as { documentSelector?: unknown } | undefined)
		?.documentSelector;
	return (
		Array.isArray(selector) &&
		selector.length > 0 &&
		selector.every(
			(filter) =>
				typeof filter === "object" &&
				filter !== null &&
				Object.keys(filter).every((key) => key === "pattern") &&
				/\.crab$/.test((filter as { pattern: string }).pattern),
		)
	);
}

async function stopAll(): Promise<void> {
	const running = [...clients.values()];
	clients.clear();
	failures.clear();
	await Promise.all(running.map((client) => client.stop().catch(() => {})));
}

async function restart(): Promise<void> {
	await stopAll();
	await Promise.all(workspace.textDocuments.map(ensureServer));
}

/** The TypeScript 7.1+ package that serves `file`, if there is one. */
export function findTypeScript(file: Uri): TypeScriptPackage | undefined {
	const configured = workspace
		.getConfiguration("crabrave", file)
		.get<string>("typescript.path");
	if (configured) {
		const folder = workspace.getWorkspaceFolder(file)?.uri.fsPath ?? "";
		const path = configured.startsWith(".")
			? join(folder, configured)
			: configured;
		return inspect(path, folder || dirname(path));
	}
	for (let dir = dirname(file.fsPath); ; dir = dirname(dir)) {
		const candidate = inspect(join(dir, "node_modules", "typescript"), dir);
		if (candidate) return candidate;
		if (dirname(dir) === dir) return undefined;
	}
}

function inspect(path: string, project: string): TypeScriptPackage | undefined {
	const manifest = join(path, "package.json");
	if (!existsSync(manifest)) return undefined;
	const { version } = JSON.parse(readFileSync(manifest, "utf8")) as {
		version: string;
	};
	const [major, minor] = version.split(".").map(Number);
	if (major < 7 || (major === 7 && minor < 1)) return undefined;
	const executable = nativeExecutable(path);
	return executable ? { path, version, executable, project } : undefined;
}

/** Mirrors `typescript/lib/getExePath.js`. */
function nativeExecutable(path: string): string | undefined {
	const platformPackage = `@typescript/typescript-${process.platform}-${process.arch}`;
	try {
		const require = createRequire(join(path, "package.json"));
		const manifest = require.resolve(`${platformPackage}/package.json`);
		const executable = join(
			dirname(manifest),
			"lib",
			process.platform === "win32" ? "tsc.exe" : "tsc",
		);
		return existsSync(executable) ? executable : undefined;
	} catch {
		return undefined;
	}
}
