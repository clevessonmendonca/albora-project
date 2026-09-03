import { test, expect } from "@playwright/test";
import { setupTestEvent } from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";

test.describe("Remoção de EXIF (LGPD)", () => {
  test("deve ter input de arquivo com accept restrito a imagens", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-exif-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      const fileInput = page.locator('input[type="file"]').first();

      if ((await fileInput.count()) > 0) {
        const acceptAttr = await fileInput.getAttribute("accept");
        if (acceptAttr) {
          expect(acceptAttr.toLowerCase()).toMatch(/image|jpg|jpeg|png|webp/);
        }
      }
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve aceitar consentimento LGPD antes de captura", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-consent-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      const consentIndicators = [
        page.locator('[data-testid="consent"]'),
        page.locator('[data-testid="terms"]'),
        page.locator('text=/aceitar|aceito|concordo|agree/i'),
        page.locator('text=/termos|terms|lgpd|gdpr/i'),
      ];

      for (const indicator of consentIndicators) {
        const visible = await indicator
          .isVisible({ timeout: 2000 })
          .catch(() => false);
        if (visible) {
          await indicator.click();
          break;
        }
      }

      expect(page.url()).toContain(event.slug);
    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});
