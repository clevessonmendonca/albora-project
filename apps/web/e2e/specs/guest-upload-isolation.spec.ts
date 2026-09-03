import { test, expect } from "@playwright/test";
import {
  setupTestEvent,
  getEventUploads,
} from "../helpers/setup-test-event";
import { cleanupTestEvent } from "../helpers/cleanup";

test.describe("Isolamento RLS entre Eventos", () => {
  test("deve isolar uploads entre diferentes eventos", async ({ page }) => {
    const event1 = await setupTestEvent({
      slug: `test-rls-event1-${Date.now()}`,
    });

    const event2 = await setupTestEvent({
      slug: `test-rls-event2-${Date.now()}`,
    });

    try {
      await page.goto(`/e/${event1.slug}/photo`);
      await page.waitForLoadState("networkidle");

      const event2Uploads = await getEventUploads(event2.id);
      expect(event2Uploads.length).toBe(0);

      await page.goto(`/e/${event2.slug}/feed`);
      await page.waitForLoadState("networkidle");

      const feedItems = page.locator('[data-testid="feed-item"]');
      expect(await feedItems.count()).toBe(0);
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
      expect(event1.id).not.toBe(event2.id);
      expect(event1.slug).not.toBe(event2.slug);

      const uploads1 = await getEventUploads(event1.id);
      const uploads2 = await getEventUploads(event2.id);

      expect(uploads1.length).toBe(0);
      expect(uploads2.length).toBe(0);
    } finally {
      await cleanupTestEvent(event1.id);
      await cleanupTestEvent(event2.id);
    }
  });
});
