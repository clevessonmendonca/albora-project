import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke E2E (gate MVP).
 *
 * Sempre (rápido): landing, admin sign-in, telão (`/telao`).
 * Com E2E_FULL=1 (+ `pnpm db:semear`): convidado, upload mock, código do telão.
 *
 * Local: `pnpm dev` serve as rotas (compila sob demanda, mas o cache do
 * `.next` sobrevive entre rodadas). CI: `E2E_BUILT=1` depois de `pnpm build`.
 */

/*
 * `next dev` compila cada rota na PRIMEIRA requisição, e essa compilação cai
 * dentro do orçamento do teste que tocar a rota primeiro. Com `.next` frio —
 * o estado em que o runner sempre começa — /e/[slug] leva 31,7s com a máquina
 * ociosa e 62,6s sob carga, contra um limite de 30s por teste. Era a origem da
 * intermitência do gate: o teste não media o app, media o webpack. Servido por
 * `next start` a mesma rota responde em 0,13s, e o número não se move sob
 * carga. Ver docs/adr/0016 e tools/e2e/medir-compilacao.mjs.
 */
const SERVIDOR_COMPILADO = !!process.env.E2E_BUILT;

if (process.env.CI && !SERVIDOR_COMPILADO && !process.env.PLAYWRIGHT_SKIP_SERVER) {
  throw new Error(
    "E2E no CI exige E2E_BUILT=1 com um `pnpm build` anterior. Contra `next dev` " +
      "a compilação sob demanda entra no orçamento do teste e o gate passa a " +
      "falhar por carga do runner, não por regressão. Ver docs/adr/0016.",
  );
}

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
        command: SERVIDOR_COMPILADO ? "pnpm --filter @albora/web start" : "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
