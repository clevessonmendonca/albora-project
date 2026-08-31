import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/db/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // A suíte derruba e recria o schema; rodar arquivos em paralelo faria um
    // apagar o banco embaixo do outro.
    fileParallelism: false,
    hookTimeout: 60_000,
    // Criar evento + jobs de retenção sob carga do pre-push passa de 5s.
    testTimeout: 30_000,
  },
});
