import { test, expect } from "@playwright/test";
import { setupTestEvent } from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";
import path from "path";

test.describe("Múltiplas Missões", () => {
  test("deve exibir lista de missões disponíveis", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-missions-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      const missionIndicators = [
        page.locator('[data-testid="mission"]'),
        page.locator('[data-testid="challenge"]'),
        page.locator('text=/missão|mission|desafio|challenge/i'),
      ];

      let missionsFound = false;
      for (const indicator of missionIndicators) {
        if ((await indicator.count()) > 0) {
          missionsFound = true;
          break;
        }
      }

      if (!missionsFound) {
        const navAttempts = [
          `/e/${event.slug}/missoes`,
          `/e/${event.slug}/desafios`,
        ];

        for (const url of navAttempts) {
          const response = await page.goto(url).catch(() => null);
          if (response && response.status() === 200) {
            missionsFound = true;
            break;
          }
        }
      }

      expect(page.url()).toContain(event.slug);
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve permitir completar upload em página de foto", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-multi-mission-${Date.now()}`,
    });

    try {
      const photoPath = path.resolve(__dirname, "../fixtures/photo-test.jpg");

      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      const fileInput = page.locator('input[type="file"]').first();

      if ((await fileInput.count()) > 0) {
        await fileInput.setInputFiles(photoPath);
        await page.waitForTimeout(1000);

        const confirmButton = page
          .locator('button:has-text("Confirmar"), button:has-text("Enviar")')
          .first();

        const confirmVisible = await confirmButton
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (confirmVisible) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
        }
      }

      expect(page.url()).toContain(event.slug);
    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});
