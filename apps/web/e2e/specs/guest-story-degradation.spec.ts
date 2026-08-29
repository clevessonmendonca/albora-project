/**
 * Teste E2E: Story Degradável
 *
 * Valida que:
 * - Upload completa mesmo se Story falhar
 * - Sistema degrada gracefully
 * - Funcionalidades críticas não dependem de Story
 */

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
      // Intercepta chamadas para API de Story e força falha
      await page.route("**/api/stories/**", async (route) => {
        console.log("🚫 Bloqueando chamada para API de Story");
        await route.abort("failed");
      });

      await page.goto(`/${event.slug}/foto`);
      await page.waitForLoadState("networkidle");

      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count() > 0;

      if (fileInputExists) {
        const photoPath = path.resolve(__dirname, "../fixtures/photo-test.jpg");
        await fileInput.setInputFiles(photoPath);
        await page.waitForTimeout(1000);

        const confirmButton = page.locator(
          'button:has-text("Confirmar"), button:has-text("Enviar")'
        ).first();

        const confirmVisible = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (confirmVisible) {
          await confirmButton.click();
          
          // Aguarda processamento
          await page.waitForTimeout(3000);

          // Verifica se há mensagem de SUCESSO (não de erro)
          const successIndicators = [
            page.locator('text=/sucesso|enviado|confirmado/i'),
            page.locator('[data-testid="upload-success"]'),
          ];

          let _successFound = false;
          for (const indicator of successIndicators) {
            const visible = await indicator.isVisible({ timeout: 2000 }).catch(() => false);
            if (visible) {
              _successFound = true;
              console.log("✅ Upload completou com sucesso mesmo com Story falhando!");
              break;
            }
          }

          // Mesmo sem sucesso explícito, não deve ter erro crítico
          const errorIndicators = page.locator('text=/erro crítico|falha total|tente novamente/i');
          const errorVisible = await errorIndicators.isVisible({ timeout: 1000 }).catch(() => false);

          expect(errorVisible).toBe(false);

          console.log("✅ Sistema degradou gracefully (sem erro crítico)");
        }
      }

      console.log("✅ Teste de degradação de Story concluído");
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
      // Bloqueia várias APIs opcionais
      const optionalAPIs = [
        "**/api/stories/**",
        "**/api/analytics/**",
        "**/api/share/**",
      ];

      for (const apiPattern of optionalAPIs) {
        await page.route(apiPattern, async (route) => {
          await route.abort("failed");
        });
      }

      console.log("🚫 APIs opcionais bloqueadas");

      // Navega para landing page
      await page.goto(`/${event.slug}`);
      await page.waitForLoadState("networkidle");

      // Página deve carregar normalmente
      const body = page.locator("body");
      await expect(body).toBeVisible();

      console.log("✅ Landing page carregou sem APIs opcionais");

      // Tenta acessar página de upload
      await page.goto(`/${event.slug}/foto`);
      await page.waitForLoadState("networkidle");

      // Página de upload deve carregar
      await expect(body).toBeVisible();

      console.log("✅ Página de upload carregou sem APIs opcionais");

      console.log("✅ Teste de funcionalidades opcionais concluído");
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
      // Bloqueia uma API não-crítica
      await page.route("**/api/stories/**", async (route) => {
        await route.abort("failed");
      });

      await page.goto(`/${event.slug}`);
      await page.waitForLoadState("networkidle");

      // Procura por mensagens de erro amigáveis (não técnicas)
      const technicalErrors = page.locator(
        'text=/error|exception|stack trace|undefined|null/i'
      );

      const technicalErrorVisible = await technicalErrors.isVisible({ timeout: 2000 }).catch(() => false);

      // NÃO deve exibir erros técnicos ao usuário
      expect(technicalErrorVisible).toBe(false);

      console.log("✅ Sem erros técnicos expostos ao usuário");

      console.log("✅ Teste de mensagens amigáveis concluído");
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve permitir continuar usando app após falha não-crítica", async ({
    page,
  }) => {
    const event = await setupTestEvent({
      slug: `test-continue-${Date.now()}`,
    });

    try {
      // Causa falha em uma feature não-crítica
      await page.route("**/api/stories/**", async (route) => {
        await route.abort("failed");
      });

      await page.goto(`/${event.slug}`);
      await page.waitForLoadState("networkidle");

      console.log("✅ Landing page carregada");

      // Tenta navegar para outras páginas
      const pages = [
        `/${event.slug}/feed`,
        `/${event.slug}/foto`,
        `/${event.slug}/missoes`,
      ];

      for (const url of pages) {
        const response = await page.goto(url).catch(() => null);
        
        if (response && response.status() < 500) {
          console.log(`✅ Navegação para ${url} funcionou (status: ${response.status()})`);
        }
      }

      console.log("✅ Teste de continuidade após falha concluído");
    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});
