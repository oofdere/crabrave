// Downloads VS Code (cached in .vscode-test/) and runs test/suite inside it,
// with lang/ as the workspace. On Linux without a display, run it under
// `xvfb-run -a`.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runTests } from "@vscode/test-electron";

const extension = fileURLToPath(new URL("..", import.meta.url));
const lang = fileURLToPath(new URL("../../..", import.meta.url));
const profile = mkdtempSync(join(tmpdir(), "crabrave-vscode-"));

try {
	await runTests({
		version: process.env.VSCODE_VERSION ?? "1.142.0",
		extensionDevelopmentPath: extension,
		extensionTestsPath: join(extension, "dist", "test", "index.js"),
		launchArgs: [
			lang,
			"--disable-workspace-trust",
			"--disable-extensions",
			"--skip-welcome",
			"--skip-release-notes",
			`--user-data-dir=${join(profile, "user")}`,
			`--extensions-dir=${join(profile, "extensions")}`,
		],
	});
} catch (error) {
	console.error(error);
	process.exit(1);
}
