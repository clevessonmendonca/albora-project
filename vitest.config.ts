import path from "node:path";
import { defineConfig } from "vitest/config";

// A suíte de isolamento exige Postgres de verdade e roda em job próprio (`pnpm test:isolamento`). Fora dali ela não é pulada por conveniência: é que uma falha de isolamento perdida no meio de "testes falharam" deixa de parecer o que é.
const EXCLUDE = ["**/node_modules/**", "**/dist/**", "spike/**", "packages/db/**"];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "apps/web"),
    },
  },
  test: {
    // Pre-push paralelo (jsdom + PDF + db) estoura o default 5s em testes triviais de render. 15s não esconde hang real.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Máquina saturada no pre-push: setup 388s / environment 585s com workers default. Metade dos cores deixa o render de componente abaixo do teto.
    maxWorkers: "50%",
    server: {
      deps: {
        inline: ["@albora/core", "@albora/db", "@albora/packs", "zod"],
      },
    },
    // Dois projetos, dois environments: lógica pura roda em node (rápido, sem DOM); render de componente (.test.tsx) precisa de jsdom. O `environmentMatchGlobs` equivalente está deprecado no Vitest 3 — `projects` é a forma suportada de escopar environment + setupFiles por glob sem afetar a suíte node existente.
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
          // Render em paralelo sob carga do pre-push estoura o default 5s (FloatingNav, Button, RecapCard). 30s não esconde hang real.
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
      // Gates MVP (CLAUDE.md): ≥60% global, ≥90% no pipeline de upload.
      //
      // O pipeline de upload JÁ está na meta (99,5% de linhas medido em
      // 2026-09-05) e entra abaixo com o número real do CLAUDE.md — arquivo
      // que caia abaixo de 90% reprova a MR.
      //
      // O global ainda não chegou aos 60%: o medido é 36,7% de linhas. O piso
      // aqui é o VALOR MEDIDO, arredondado para baixo, e não a meta — ligar em
      // 60 hoje reprovaria toda MR e o gate seria desligado de novo na semana
      // seguinte. O que este número impede a partir de agora é a cobertura
      // CAIR, que é o comportamento perigoso. Subir é degrau com data, não
      // decreto: cada MR que cobrir código novo pode subir o piso junto.
      //
      // Nunca use `coverage.exclude` para fazer um número fechar — o CLAUDE.md
      // só admite exclusão por linha, com motivo, revisada na MR.
      thresholds: {
        lines: 36,
        statements: 36,
        functions: 70,
        branches: 83,

        // Pipeline de upload — o caminho crítico do convidado. Arquivos
        // casados por estes globs saem da conta global e são avaliados aqui.
        "apps/web/app/api/uploads/**": {
          lines: 90, statements: 90, functions: 90, branches: 85,
        },
        "apps/web/features/photo/hooks/use-{upload,event-queue}.ts": {
          lines: 90, statements: 90, functions: 90, branches: 85,
        },
        "apps/web/lib/application/use-cases/guest/confirm-upload.ts": {
          lines: 90, statements: 90, functions: 90, branches: 85,
        },
        "packages/core/src/{upload,fila,chaves,exif,processar}.ts": {
          lines: 90, statements: 90, functions: 90, branches: 85,
        },
      },
    },
  },
});
