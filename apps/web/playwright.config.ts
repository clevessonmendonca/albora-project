import { defineConfig, devices, type ReporterDescription } from "@playwright/test";

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
    baseURL: "http://localhost:3000",

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
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  timeout: 30_000,
});
