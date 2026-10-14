import { defineConfig } from "vitest/config";
import crabrave from "./src/vite.ts";

export default defineConfig({
	plugins: [crabrave()],
});
