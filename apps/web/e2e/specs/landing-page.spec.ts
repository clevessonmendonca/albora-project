import { test, expect } from "@playwright/test";
import {
  setupTestEvent,
  getEventBySlug,
} from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";

test.describe("Landing Page do Evento", () => {
  test("deve carregar landing page com informações do evento", async ({
    page,
  }) => {
    const event = await setupTestEvent({
      slug: `test-landing-${Date.now()}`,
      packId: "casamento",
    });

    try {
      await page.goto(`/e/${event.slug}`);
      await page.waitForLoadState("networkidle");

      await expect(page).not.toHaveTitle(/404/i);
      expect(page.url()).toContain(`/e/${event.slug}`);

      const headings = page.locator("h1, h2, h3");
      expect(await headings.count()).toBeGreaterThan(0);
    } finally {
      await cleanupTestEvent(event.id);
    }
  });

  test("deve retornar 404 para evento inexistente", async ({ page }) => {
    const response = await page.goto("/e/evento-que-nao-existe-12345");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByText(/esse endereço não abre nenhuma festa/i)
    ).toBeVisible();
  });

  test("deve persistir evento no banco de dados", async () => {
    const event = await setupTestEvent({
      slug: `test-db-${Date.now()}`,
    });

    try {
      const foundEvent = await getEventBySlug(event.slug);

      expect(foundEvent).not.toBeNull();
      expect(foundEvent?.id).toBe(event.id);
      expect(foundEvent?.slug).toBe(event.slug);
      expect(foundEvent?.packId).toBe("casamento");
    } finally {
      await cleanupTestEvent(event.id);
    }
  });
});
