import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke E2E (gate MVP).
 *
 * Sempre (rápido): landing, admin sign-in, telão estático (`/wall-display`).
 * Com E2E_FULL=1 (+ `pnpm db:semear`): convidado, upload mock, código do telão.
 *
 * Requer servidor local (`pnpm dev`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
