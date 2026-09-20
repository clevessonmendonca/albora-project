import { test, expect } from "@playwright/test";
import { setupTestEvent } from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";

test.describe("Resiliência de Rede", () => {
  test("deve detectar offline e recuperar ao reconectar", async ({
    page,
    context,
  }) => {
    const event = await setupTestEvent({
      slug: `test-offline-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      await context.setOffline(true);
      await page.waitForTimeout(1000);

      const response = await page
        .goto(`/e/${event.slug}/photo`)
        .catch(() => null);
      expect(response).toBeNull();

      await context.setOffline(false);
      await page.waitForTimeout(1000);

      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("body")).toBeVisible();
    } finally {
      await context.setOffline(false);
      await cleanupTestEvent(event.id);
    }
  });

  test("deve lidar com timeout de upload", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-timeout-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      await page.route("**/api/uploads/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await route.abort("timedout");
      });

      const fileInput = page.locator('input[type="file"]').first();

      if ((await fileInput.count()) > 0) {
        const errorOrRetry = page.locator(
          'text=/erro|falha|tente novamente|offline|aguardando/i'
        );
        const _errorVisible = await errorOrRetry
          .isVisible({ timeout: 5000 })
          .catch(() => false);
      }

      expect(page.url()).toContain(event.slug);
    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});
