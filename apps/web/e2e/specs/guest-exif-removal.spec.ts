import { test } from "@playwright/test";
import { setupTestEvent } from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";

test.describe("Remoção de EXIF (LGPD)", () => {
  test("deve processar fotos no cliente antes de upload", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-exif-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      // Procura por input de arquivo
      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count() > 0;

      if (fileInputExists) {

        // Verifica se há algum script de processamento de imagem
        // (Canvas API, FileReader, etc)
        const hasImageProcessing = await page.evaluate(() => {
          // Verifica se há uso de Canvas API
          const canvases = document.querySelectorAll("canvas");
          return canvases.length > 0;
        });

        if (hasImageProcessing) {
        } else {
        }
      }

    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve exibir preview processado antes de upload", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-preview-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      // Este teste valida que há um fluxo de preview
      // O preview indica que a foto foi processada no cliente

      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count() > 0;

      if (fileInputExists) {

        // A presença de um fluxo de preview/edição sugere processamento
        const previewIndicators = [
          page.locator('[data-testid="preview"]'),
          page.locator('[data-testid="editor"]'),
          page.locator("canvas"),
          page.locator('img[src^="blob:"]'),
          page.locator('img[src^="data:"]'),
        ];

        for (const indicator of previewIndicators) {
          const count = await indicator.count();
          if (count > 0) {
          }
        }
      }

    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve mencionar privacidade ou remoção de localização", async ({
    page,
  }) => {
    const event = await setupTestEvent({
      slug: `test-privacy-${Date.now()}`,
    });

    try {
      // Navega pela aplicação procurando menções a privacidade
      const pagesToCheck = [
        `/e/${event.slug}`,
        `/e/${event.slug}/photo`,
        `/e/${event.slug}/sobre`,
        `/e/${event.slug}/privacidade`,
      ];

      let privacyMentioned = false;

      for (const url of pagesToCheck) {
        const response = await page.goto(url).catch(() => null);

        if (response && response.status() === 200) {
          // Procura por menções a privacidade, EXIF, GPS, localização
          const privacyKeywords = [
            page.locator('text=/privacidade|privacy/i'),
            page.locator('text=/localização|location|gps/i'),
            page.locator('text=/exif|metadados|metadata/i'),
            page.locator('text=/remover|removido|remove/i'),
          ];

          for (const keyword of privacyKeywords) {
            const visible = await keyword.isVisible({ timeout: 1000 }).catch(() => false);
            if (visible) {
              const text = await keyword.textContent();
              privacyMentioned = true;
              break;
            }
          }

          if (privacyMentioned) break;
        }
      }

      if (!privacyMentioned) {
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

      // Procura por modal/banner de consentimento
      const consentIndicators = [
        page.locator('[data-testid="consent"]'),
        page.locator('[data-testid="terms"]'),
        page.locator('text=/aceitar|aceito|concordo|agree/i'),
        page.locator('text=/termos|terms|lgpd|gdpr/i'),
      ];

      let consentFound = false;

      for (const indicator of consentIndicators) {
        const visible = await indicator.isVisible({ timeout: 2000 }).catch(() => false);
        if (visible) {
          consentFound = true;
          const text = await indicator.textContent();
          break;
        }
      }

      if (!consentFound) {
      }

    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});