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
      // `json-summary` alimenta `tools/coverage/piso-global.mjs` (ver abaixo)
      // com o agregado `coverage/coverage-summary.json`.
      reporter: ["text-summary", "lcov", "json-summary"],
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
      // `perFile: true` abaixo é REAL, ao contrário do que dizia o comentário
      // anterior desta MR: sem ele o Vitest compara o AGREGADO de cada grupo
      // de glob contra o piso, não cada arquivo — um arquivo a 50% dilui-se
      // atrás de outro a 100% no mesmo grupo e o CI passa verde (achado A0 do
      // review de gates: era o que acontecia com `packages/core/src/upload.ts`
      // a 50%/0% dentro de um grupo ~99%, hoje coberto por `upload.test.ts`).
      //
      // `perFile` só existe no Vitest 3.2.7 como flag ÚNICA e GLOBAL —
      // confirmado lendo `resolveThresholds`/`checkThresholds` em
      // `node_modules/vitest/dist/chunks/coverage.*.js`: os dois leem um
      // único `this.options.thresholds?.perFile`, aplicado a TODO conjunto de
      // threshold resolvido (o "global" e cada grupo de glob), sem forma de
      // escopar por grupo. Por isso o piso global (lines/statements/
      // functions/branches) NÃO mora mais aqui: com `perFile` ligado, um piso
      // global aqui seria cobrado arquivo a arquivo e reprovaria quase todo
      // arquivo do repo a 36% de linhas — não é essa a garantia que o piso
      // global promete (ele é sobre o AGREGADO). O piso global agora é
      // checado por `tools/coverage/piso-global.mjs`, chamado logo depois
      // deste comando em `pnpm test:coverage` — os valores e o motivo de cada
      // um (inclusive `functions`/`branches` com folga honesta) estão
      // documentados naquele arquivo, não duplicados aqui.
      //
      // Cobertura sob gate de 90% hoje: as quatro rotas de
      // `apps/web/app/api/uploads/**`, os hooks `use-upload`/`use-event-queue`,
      // `confirm-upload.ts` e os módulos puros de `packages/core/src/`. Isso é
      // PARTE do caminho crítico do convidado, não o caminho inteiro: a
      // camada de infraestrutura que esses módulos chamam —
      // `apps/web/lib/infrastructure/queue/client.ts` (83,8%),
      // `apps/web/lib/utils/transport.ts` (81,4%),
      // `apps/web/lib/infrastructure/storage/r2-client.ts` (23,5%) e
      // `apps/web/lib/domain/image/image.ts` (88,0%) — ainda não está sob
      // gate de 90% e continua caindo no piso global. Trazê-la para 90% é
      // ~135 linhas de teste novo, tarefa própria (não incluída nesta
      // correção); os arquivos de import direto (`apps/web/lib/{queue,
      // transport,r2,image}.ts`) são barris `@deprecated` de uma linha cada —
      // colocá-los no glob não mediria nada.
      //
      // Nunca use `coverage.exclude` para fazer um número fechar — o CLAUDE.md
      // só admite exclusão por linha, com motivo, revisada na MR.
      thresholds: {
        perFile: true,

        // Pipeline de upload — parte do caminho crítico do convidado (ver
        // nota acima sobre a camada de infraestrutura, ainda fora do gate).
        // Arquivos casados por estes globs saem da conta global e são
        // avaliados aqui, POR ARQUIVO.
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
