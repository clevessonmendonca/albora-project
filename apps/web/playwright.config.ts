import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração do Playwright para testes E2E do Albora
 *
 * Ver: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e/specs",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ["html"],
    ["list"],
    ...(process.env.CI ? [["github" as const]] : []),
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Screenshots on failure */
    screenshot: "only-on-failure",

    /* Video on retry */
    video: "retain-on-failure",

    /* Timeout for each action (e.g., click, fill) */
    actionTimeout: 10_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },

    // Descomente para testar em mais navegadores
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // 2 min para o dev server iniciar
  },

  /* Global timeout por teste */
  timeout: 30_000, // 30s
});
