import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke E2E (gate MVP).
 *
 * Sempre (rápido): landing, admin sign-in, telão (`/telao`).
 * Com E2E_FULL=1 (+ `pnpm db:semear`): convidado, upload mock, código do telão.
 *
 * Local: `pnpm dev`. No CI: `next start` sobre um build (o job roda
 * `pnpm build` antes). A diferença não é preferência — sob `next dev` a rota
 * é compilada sob demanda, e a primeira navegação até a de câmera, a mais
 * pesada do app, consumia sozinha o orçamento do teste: o fluxo completo do
 * convidado passava só no retry e voltava a falhar mesmo com `test.slow()`.
 * Com as rotas pré-compiladas essa classe de falha deixa de existir, e o
 * teste passa a medir o produto em vez do compilador.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_SERVER
    ? undefined
    : {
        command: process.env.CI ? "pnpm --filter @albora/web start" : "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
