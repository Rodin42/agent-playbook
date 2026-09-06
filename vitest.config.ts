import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests import the workspace packages by name; alias them to source so the suite
// never depends on a prior build.
export default defineConfig({
  resolve: {
    alias: {
      "@factory/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node",
  },
});
