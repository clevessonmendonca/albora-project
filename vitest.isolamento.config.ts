import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mesmo alias da config principal: `staff-session.test.ts` mora em apps/web
  // e importa por `@/…`. Sem isto o arquivo nem carrega aqui.
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "apps/web"),
    },
  },
  test: {
    // `apps/web/lib/console/staff-session.test.ts` mora em apps/web mas chama
    // `prepararBanco()` — precisa de Postgres, então roda AQUI, no job que sobe
    // o banco, e não no de typecheck/lint, que não sobe.
    include: [
      "packages/db/**/*.test.ts",
      "packages/application/**/*.test.ts",
      "apps/web/lib/console/staff-session.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // A suíte derruba e recria o schema; rodar arquivos em paralelo faria um apagar o banco embaixo do outro.
    fileParallelism: false,
    hookTimeout: 60_000,
    // Criar evento + jobs de retenção sob carga do pre-push passa de 5s.
    testTimeout: 30_000,
  },
});
