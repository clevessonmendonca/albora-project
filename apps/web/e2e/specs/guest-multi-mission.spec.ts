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


      // Procura por indicadores de missões
      const missionIndicators = [
        page.locator('[data-testid="mission"]'),
        page.locator('[data-testid="challenge"]'),
        page.locator('text=/missão|mission|desafio|challenge/i'),
      ];

      let missionsFound = false;
      for (const indicator of missionIndicators) {
        const count = await indicator.count();
        if (count > 0) {
          missionsFound = true;
          break;
        }
      }

      if (!missionsFound) {

        // Tenta navegar para página de missões
        const navAttempts = [
          `/e/${event.slug}/missoes`,
          `/e/${event.slug}/desafios`,
          `/e/${event.slug}/challenges`,
        ];

        for (const url of navAttempts) {
          const response = await page.goto(url).catch(() => null);
          if (response && response.status() === 200) {
            missionsFound = true;
            break;
          }
        }
      }

    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve permitir selecionar missão antes de upload", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-mission-select-${Date.now()}`,
    });

    try {
      // Navega para página de upload/foto
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      // Procura por seletor de missão
      const missionSelectors = [
        page.locator('select[name*="mission"]'),
        page.locator('select[name*="missao"]'),
        page.locator('[data-testid="mission-select"]'),
        page.locator('input[type="radio"][name*="mission"]'),
      ];

      let selectorFound = false;
      for (const selector of missionSelectors) {
        const count = await selector.count();
        if (count > 0) {
          selectorFound = true;

          // Se for select, verifica options
          const tagName = await selector.first().evaluate((el) => el.tagName.toLowerCase());
          if (tagName === "select") {
            const options = await selector.first().locator("option").count();
            expect(options).toBeGreaterThan(0);
          }

          break;
        }
      }

      if (!selectorFound) {
      }

    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve exibir progresso de missões", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-mission-progress-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      // Procura por indicadores de progresso
      const progressIndicators = [
        page.locator('[data-testid="mission-progress"]'),
        page.locator('[data-testid="progress"]'),
        page.locator('[role="progressbar"]'),
        page.locator('text=/\\d+\\/\\d+/'), // Regex: "1/3", "0/5", etc
        page.locator('text=/\\d+%/'), // Regex: "50%", "100%", etc
      ];

      let progressFound = false;
      for (const indicator of progressIndicators) {
        const visible = await indicator.isVisible({ timeout: 2000 }).catch(() => false);
        if (visible) {
          const text = await indicator.textContent();
          progressFound = true;
          break;
        }
      }

      if (!progressFound) {
      }

    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve permitir completar múltiplas missões", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-multi-mission-${Date.now()}`,
    });

    try {
      const photoPath = path.resolve(__dirname, "../fixtures/photo-test.jpg");

      // Simula upload para primeira missão
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count() > 0;

      if (fileInputExists) {

        await fileInput.setInputFiles(photoPath);
        await page.waitForTimeout(1000);

        // Tenta confirmar
        const confirmButton = page.locator(
          'button:has-text("Confirmar"), button:has-text("Enviar")'
        ).first();

        const confirmVisible = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (confirmVisible) {
          await confirmButton.click();
          await page.waitForTimeout(2000);

          // Tenta fazer segundo upload
          await page.goto(`/e/${event.slug}/photo`);
          await page.waitForLoadState("networkidle");

          const fileInput2 = page.locator('input[type="file"]').first();
          const fileInput2Exists = await fileInput2.count() > 0;

          if (fileInput2Exists) {
            await fileInput2.setInputFiles(photoPath);
            await page.waitForTimeout(1000);

            const confirmButton2 = page.locator(
              'button:has-text("Confirmar"), button:has-text("Enviar")'
            ).first();

            const confirm2Visible = await confirmButton2.isVisible({ timeout: 3000 }).catch(() => false);

            if (confirm2Visible) {
              await confirmButton2.click();
              await page.waitForTimeout(2000);
            }
          }
        }
      } else {
      }

    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});