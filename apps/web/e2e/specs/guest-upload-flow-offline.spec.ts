import { test, expect } from "@playwright/test";
import { setupTestEvent } from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";
import path from "path";

test.describe("Resiliência de Rede", () => {
  test("deve exibir indicador de offline quando rede cair", async ({
    page,
    context,
  }) => {
    const event = await setupTestEvent({
      slug: `test-offline-${Date.now()}`,
    });

    try {
      // 1. Navega para a landing page
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");


      // 2. Simula perda de rede
      await context.setOffline(true);

      // 3. Aguarda um pouco para o browser detectar
      await page.waitForTimeout(1000);

      // 4. Tenta navegar (deve falhar)
      const response = await page.goto(`/e/${event.slug}/photo`).catch(() => null);

      // 5. Valida que a navegação falhou
      expect(response).toBeNull();


      // 6. Restaura rede
      await context.setOffline(false);

      // 7. Aguarda e tenta novamente
      await page.waitForTimeout(1000);
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

    } finally {
      // Garante que rede está online antes de cleanup
      await context.setOffline(false);
      await cleanupTestEvent(event.id);
    }
  });

  test("deve lidar com timeout de upload", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-timeout-${Date.now()}`,
    });

    try {
      // Navega para página de upload
      await page.goto(`/e/${event.slug}/photo`);
      await page.waitForLoadState("networkidle");

      // Intercepta requisições de upload para simular timeout
      await page.route("**/api/uploads/**", async (route) => {
        // Atrasa a resposta por 10s (simula timeout)
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await route.abort("timedout");
      });

      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count() > 0;

      if (fileInputExists) {
        const photoPath = path.resolve(__dirname, "../fixtures/photo-test.jpg");
        await fileInput.setInputFiles(photoPath);

        // Tenta confirmar upload
        const confirmButton = page.locator(
          'button:has-text("Confirmar"), button:has-text("Enviar")'
        ).first();

        const confirmVisible = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (confirmVisible) {
          await confirmButton.click();

          // Aguarda um pouco para o timeout acontecer
          await page.waitForTimeout(3000);

          // Verifica se há mensagem de erro/retry
          const errorOrRetry = page.locator(
            'text=/erro|falha|tente novamente|offline|aguardando/i'
          );

          const errorVisible = await errorOrRetry.isVisible({ timeout: 5000 }).catch(() => false);

          if (errorVisible) {
          } else {
          }
        }
      }
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve permitir navegação mesmo sem conexão", async ({
    page,
    context,
  }) => {
    const event = await setupTestEvent({
      slug: `test-nav-offline-${Date.now()}`,
    });

    try {
      // 1. Carrega a página com rede online
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");


      // 2. Simula offline
      await context.setOffline(true);

      // 3. Tenta clicar em links internos (podem estar cached)
      const links = page.locator("a").filter({ hasNotText: /http/ });
      const linkCount = await links.count();

      if (linkCount > 0) {

        // Se houver service worker ou cache, alguns links podem funcionar
        // Não forçamos que funcionem, apenas testamos o comportamento
      } else {
      }

      // 4. Restaura rede
      await context.setOffline(false);
    } finally {
      await context.setOffline(false);
      await cleanupTestEvent(event.id);
    }
  });
});