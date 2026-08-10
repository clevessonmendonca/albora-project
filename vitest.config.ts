import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "tools/**/*.test.mjs"],
    exclude: ["**/node_modules/**", "**/dist/**", "spike/**"],
  },
});
