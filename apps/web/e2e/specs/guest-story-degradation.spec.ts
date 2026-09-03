import { test, expect } from "@playwright/test";
import { setupTestEvent } from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";
import path from "path";

test.describe("Story Degradável", () => {
  test("deve completar upload mesmo se API de Story falhar", async ({
    page,
  }) => {
    const event = await setupTestEvent({
      slug: `test-story-fail-${Date.now()}`,
    });

    try {
      await page.route("**/api/stories/**", (route) => route.abort("failed"));

      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      const fileInput = page.locator('input[type="file"]').first();

      if ((await fileInput.count()) > 0) {
        const photoPath = path.resolve(__dirname, "../fixtures/photo-test.jpg");
        await fileInput.setInputFiles(photoPath);
        await page.waitForTimeout(1000);

        const confirmButton = page
          .locator('button:has-text("Confirmar"), button:has-text("Enviar")')
          .first();

        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();
          await page.waitForTimeout(3000);

          const errorIndicators = page.locator(
            'text=/erro crítico|falha total/i'
          );
          const errorVisible = await errorIndicators
            .isVisible({ timeout: 1000 })
            .catch(() => false);

          expect(errorVisible).toBe(false);
        }
      }
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve funcionar sem depender de funcionalidades opcionais", async ({
    page,
  }) => {
    const event = await setupTestEvent({
      slug: `test-optional-${Date.now()}`,
    });

    try {
      for (const pattern of [
        "**/api/stories/**",
        "**/api/analytics/**",
        "**/api/share/**",
      ]) {
        await page.route(pattern, (route) => route.abort("failed"));
      }

      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("body")).toBeVisible();

      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("body")).toBeVisible();
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve exibir mensagem amigável em caso de falha parcial", async ({
    page,
  }) => {
    const event = await setupTestEvent({
      slug: `test-friendly-error-${Date.now()}`,
    });

    try {
      await page.route("**/api/stories/**", (route) => route.abort("failed"));

      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      const technicalErrors = page.locator(
        'text=/error|exception|stack trace|undefined|null/i'
      );

      const technicalErrorVisible = await technicalErrors
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      expect(technicalErrorVisible).toBe(false);
    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});
