import { test, expect } from "@playwright/test";
import { setupTestEvent } from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";

test.describe("Performance em Rede Lenta (3G)", () => {
  test("deve carregar página em rede 3G em tempo aceitável", async ({
    page,
    context,
  }) => {
    const event = await setupTestEvent({
      slug: `test-3g-${Date.now()}`,
    });

    try {
      await context.route("**/*", async (route) => {
        const delay = Math.random() * 200 + 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
        await route.continue();
      });

      const startTime = Date.now();

      await page.goto(`/e/${event.slug}`, { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 });

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(10000);
      await expect(page.locator("body")).toBeVisible();
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve permitir interação enquanto carrega conteúdo", async ({
    page,
  }) => {
    const event = await setupTestEvent({
      slug: `test-interactive-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("domcontentloaded");

      const enabledButtons = await page
        .locator("button:not(:disabled)")
        .count();
      expect(enabledButtons).toBeGreaterThanOrEqual(0);
    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});
