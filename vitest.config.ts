import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "apps/web"),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tools/**/*.test.mjs"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "spike/**",
      // A suíte de isolamento exige Postgres de verdade e roda em job próprio
      // (`pnpm test:isolamento`). Fora dali ela não é pulada por conveniência:
      // é que uma falha de isolamento perdida no meio de "testes falharam"
      // deixa de parecer o que é.
      "packages/db/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "packages/**/src/**/*.ts",
        "apps/web/lib/**/*.ts",
        "apps/web/features/**/*.{ts,tsx}",
        "apps/web/app/api/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/node_modules/**",
        "**/dist/**",
        "packages/db/**",
        "spike/**",
      ],
      // Gates MVP (CLAUDE.md): ≥60% global, ≥90% upload pipeline.
      // Thresholds comentados até a suíte alcançar — o job de CI só reporta.
      // thresholds: { lines: 60, functions: 60, branches: 60, statements: 60 },
    },
  },
});
