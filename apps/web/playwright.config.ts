import { defineConfig, devices, type ReporterDescription } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const serverPort = new URL(baseURL).port || "3000";
export default defineConfig({
  testDir: "./e2e/specs",

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  ...(process.env.CI ? { workers: 1 } : {}),

  reporter: [
    ["html"],
    ["list"],
    ...(process.env.CI ? ([["github"]] as ReporterDescription[]) : []),
  ],

  use: {
    baseURL,

    trace: "on-first-retry",

    screenshot: "only-on-failure",

    video: "retain-on-failure",

    actionTimeout: 10_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],

  webServer: {
    command: process.env.CI ? `pnpm start --port ${serverPort}` : `pnpm dev --port ${serverPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  timeout: 30_000,
});
