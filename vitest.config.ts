import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// lang/ is its own package with its own Vitest setup.
		exclude: [...configDefaults.exclude, "lang/**"],
	},
});
