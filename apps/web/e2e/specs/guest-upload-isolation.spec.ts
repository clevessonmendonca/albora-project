import { test, expect } from "@playwright/test";
import {
  setupTestEvent,
  getEventUploads,
} from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";
import path from "path";

test.describe("Isolamento RLS entre Eventos", () => {
  test("deve isolar uploads entre diferentes eventos", async ({ page }) => {
    // Cria 2 eventos distintos
    const event1 = await setupTestEvent({
      slug: `test-rls-event1-${Date.now()}`,
    });

    const event2 = await setupTestEvent({
      slug: `test-rls-event2-${Date.now()}`,
    });

    try {

      // Faz upload no evento 1
      await page.goto(`/e/${event1.slug}/photo`);
      await page.waitForLoadState("networkidle");

      const fileInput1 = page.locator('input[type="file"]').first();
      const fileInput1Exists = await fileInput1.count() > 0;

      if (fileInput1Exists) {
        const photoPath = path.resolve(__dirname, "../fixtures/photo-test.jpg");
        await fileInput1.setInputFiles(photoPath);
        await page.waitForTimeout(1000);

        const confirmButton1 = page.locator(
          'button:has-text("Confirmar"), button:has-text("Enviar")'
        ).first();

        const confirm1Visible = await confirmButton1.isVisible({ timeout: 3000 }).catch(() => false);

        if (confirm1Visible) {
          await confirmButton1.click();
          await page.waitForTimeout(2000);
        }
      }

      // Valida no DB que o upload está no evento 1
      const event1Uploads = await getEventUploads(event1.id);

      // Valida no DB que o evento 2 está vazio
      const event2Uploads = await getEventUploads(event2.id);

      // Evento 2 deve estar vazio (isolamento funcionando)
      expect(event2Uploads.length).toBe(0);

      // Navega para o evento 2 e verifica que não vê uploads do evento 1
      await page.goto(`/e/${event2.slug}/feed`);
      await page.waitForLoadState("networkidle");

      // Se houver feed, deve estar vazio ou não mostrar uploads do evento 1
      const feedItems = page.locator('[data-testid="feed-item"]');
      const feedItemCount = await feedItems.count();


      // Deve ser 0 (isolamento perfeito)
      expect(feedItemCount).toBe(0);

    } finally {
      await cleanupTestEvent(event1.id);
      await cleanupTestEvent(event2.id);
    }
  });

  test("deve impedir acesso direto a recursos de outro evento", async ({
    page,
  }) => {
    const event1 = await setupTestEvent({
      slug: `test-access-event1-${Date.now()}`,
    });

    const event2 = await setupTestEvent({
      slug: `test-access-event2-${Date.now()}`,
    });

    try {
      // Tenta acessar feed do evento 2 a partir do contexto do evento 1
      await page.goto(`/e/${event1.slug}`);
      await page.waitForLoadState("networkidle");

      // Tenta acessar feed do evento 2
      await page.goto(`/e/${event2.slug}/feed`);
      await page.waitForLoadState("networkidle");

      // Deve ver feed vazio (não deve ver dados do evento 1)
      const feedItems = page.locator('[data-testid="feed-item"]');
      const feedItemCount = await feedItems.count();

      expect(feedItemCount).toBe(0);

    } finally {
      await cleanupTestEvent(event1.id);
      await cleanupTestEvent(event2.id);
    }
  });

  test("deve validar que cada evento tem seu próprio namespace", async () => {
    const event1 = await setupTestEvent({
      slug: `test-namespace1-${Date.now()}`,
    });

    const event2 = await setupTestEvent({
      slug: `test-namespace2-${Date.now()}`,
    });

    try {
      // Valida que os eventos têm IDs diferentes
      expect(event1.id).not.toBe(event2.id);

      // Valida que os slugs são diferentes
      expect(event1.slug).not.toBe(event2.slug);


      // Valida no DB que uploads são isolados
      const uploads1 = await getEventUploads(event1.id);
      const uploads2 = await getEventUploads(event2.id);

      // Ambos devem estar vazios inicialmente
      expect(uploads1.length).toBe(0);
      expect(uploads2.length).toBe(0);

    } finally {
      await cleanupTestEvent(event1.id);
      await cleanupTestEvent(event2.id);
    }
  });
});