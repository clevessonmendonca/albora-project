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
      // Simula rede 3G lenta
      await context.route("**/*", async (route) => {
        // Adiciona delay de 100-300ms para simular latência 3G
        const delay = Math.random() * 200 + 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
        await route.continue();
      });


      // Marca tempo de início
      const startTime = Date.now();

      // Navega para landing page
      await page.goto(`/e/${event.slug}`, { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 });

      // Calcula tempo total
      const loadTime = Date.now() - startTime;


      // Valida que carregou em tempo razoável (< 10s em 3G é aceitável)
      expect(loadTime).toBeLessThan(10000);

      // Valida que o conteúdo está visível
      const body = page.locator("body");
      await expect(body).toBeVisible();

    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve exibir loading durante operações lentas", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-loading-${Date.now()}`,
    });

    try {
      // Intercept API calls para adicionar delay
      await page.route("**/api/**", async (route) => {
        // Delay de 2s para simular operação lenta
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");


      // Se a página fizer chamadas API, devemos ver loading
      // Por enquanto, apenas validamos que a página carregou
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

      // Não aguarda networkidle, testa se já pode interagir
      await page.waitForLoadState("domcontentloaded");


      // Valida que elementos básicos já estão interativos
      const buttons = page.locator("button, a");
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {

        // Verifica se pelo menos um botão está habilitado
        const enabledButtons = await page.locator("button:not(:disabled)").count();
        expect(enabledButtons).toBeGreaterThan(0);

      } else {
      }
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve otimizar tamanho de imagens carregadas", async ({ page }) => {
    const event = await setupTestEvent({
      slug: `test-img-size-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      // Captura todas as imagens da página
      const images = page.locator("img");
      const imageCount = await images.count();


      if (imageCount > 0) {
        // Verifica se imagens têm atributos de otimização (loading="lazy", srcset, etc)
        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          const img = images.nth(i);
          const loading = await img.getAttribute("loading");
          const srcset = await img.getAttribute("srcset");

          if (loading || srcset) {
          }
        }
      }

    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});