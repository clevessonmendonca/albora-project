import { defineConfig } from "vitest/config";

export default defineConfig({
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
  },
});
