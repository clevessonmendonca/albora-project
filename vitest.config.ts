import path from "node:path";
import { defineConfig } from "vitest/config";

// A suíte de isolamento exige Postgres de verdade e roda em job próprio
// (`pnpm test:isolamento`). Fora dali ela não é pulada por conveniência:
// é que uma falha de isolamento perdida no meio de "testes falharam"
// deixa de parecer o que é.
const EXCLUDE = ["**/node_modules/**", "**/dist/**", "spike/**", "packages/db/**"];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "apps/web"),
    },
  },
  test: {
    // Pre-push paralelo (jsdom + PDF + db) estoura o default 5s em testes
    // triviais de render. 15s não esconde hang real.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Máquina saturada no pre-push: setup 388s / environment 585s com workers
    // default. Metade dos cores deixa o render de componente abaixo do teto.
    maxWorkers: "50%",
    // Forçar inline dos pacotes monorepo para evitar "Unexpected token 'export'"
    server: {
      deps: {
        inline: ["@albora/core", "@albora/db", "@albora/packs"],
      },
    },
    // Dois projetos, dois environments: lógica pura roda em node (rápido,
    // sem DOM); render de componente (.test.tsx) precisa de jsdom. O
    // `environmentMatchGlobs` equivalente está deprecado no Vitest 3 —
    // `projects` é a forma suportada de escopar environment + setupFiles
    // por glob sem afetar a suíte node existente.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tools/**/*.test.mjs"],
          exclude: EXCLUDE,
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["packages/**/*.test.tsx", "apps/**/*.test.tsx"],
          exclude: EXCLUDE,
          setupFiles: ["./vitest.setup.ts"],
          // Render em paralelo sob carga do pre-push estoura o default 5s
          // (FloatingNav, Button, RecapCard). 30s não esconde hang real.
          testTimeout: 30_000,
        },
      },
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
