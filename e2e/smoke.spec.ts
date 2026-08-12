import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("landing carrega com título e herói", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Albora/i);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("entrada do evento demo pede consentimento", async ({ page }) => {
    test.skip(!process.env.E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");

    await page.goto("/e/festa-demo");
    await expect(page.getByRole("button").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/consent|entrar|festa/i);
  });
});
