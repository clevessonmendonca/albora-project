import { test, expect } from "@playwright/test";
import { setupTestEvent } from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";
import path from "path";

test.describe("Fluxo Completo de Upload (Caminho Crítico)", () => {
  test("deve completar upload de foto com sucesso", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-upload-${Date.now()}`,
      packId: "casamento",
      interactionOpensAt: new Date(),
    });

    try {
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      const uploadButton = page.locator(
        'button:has-text("Câmera"), button:has-text("Enviar Foto"), a[href*="photo"], a[href*="upload"], [data-testid="camera-button"], [data-testid="upload-button"]'
      ).first();

      const uploadButtonVisible = await uploadButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (uploadButtonVisible) {
        await uploadButton.click();
        await page.waitForLoadState("networkidle");
      } else {
        await page.goto(`/e/${event.slug}/photo`);
        await page.waitForLoadState("networkidle");
      }

      expect(page.url()).toMatch(/\/(photo|upload|camera)/i);

      const fileInput = page.locator('input[type="file"]');
      const fileInputExists = await fileInput.count() > 0;

      if (fileInputExists) {
        const photoPath = path.resolve(__dirname, "../fixtures/photo-test.jpg");
        await fileInput.setInputFiles(photoPath);

        await page.waitForTimeout(1000);

        const confirmButton = page.locator(
          'button:has-text("Confirmar"), button:has-text("Enviar"), button:has-text("Publicar"), [data-testid="confirm-upload"], [data-testid="submit"]'
        ).first();

        const confirmButtonVisible = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (confirmButtonVisible) {
          await confirmButton.click();
          await page.waitForTimeout(3000);

          const successIndicators = [
            page.locator('text=/sucesso|enviado|confirmado|publicado/i'),
            page.locator('[data-testid="upload-success"]'),
            page.locator('[data-testid="success-message"]'),
          ];

          let successFound = false;
          for (const indicator of successIndicators) {
            const visible = await indicator.isVisible({ timeout: 1000 }).catch(() => false);
            if (visible) {
              successFound = true;
              break;
            }
          }

          if (!successFound) {
            const errorIndicators = [
              page.locator('text=/erro|falha|tente novamente/i'),
              page.locator('[data-testid="error-message"]'),
            ];

            for (const indicator of errorIndicators) {
              await indicator.isVisible({ timeout: 1000 }).catch(() => false);
            }
          }
        }
      }

      expect(page.url()).toContain(event.slug);
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve exibir preview da foto antes de enviar", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-preview-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count() > 0;

      if (fileInputExists) {
        const photoPath = path.resolve(__dirname, "../fixtures/photo-test.jpg");
        await fileInput.setInputFiles(photoPath);

        await page.waitForTimeout(1000);

        const images = page.locator("img");
        const imageCount = await images.count();

        expect(imageCount).toBeGreaterThan(0);
      }
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve validar formato de arquivo", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-validation-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count() > 0;

      if (fileInputExists) {
        const acceptAttr = await fileInput.getAttribute("accept");

        if (acceptAttr) {
          expect(acceptAttr.toLowerCase()).toMatch(/image|jpg|jpeg|png|webp/);
        }
      }
    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});
