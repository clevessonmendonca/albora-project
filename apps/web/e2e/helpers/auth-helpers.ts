import type { Page } from "@playwright/test";

export async function injectGuestToken(
  page: Page,
  token: string
): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem("guestToken", t);
  }, token);
}

export async function injectHostToken(page: Page, token: string): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem("hostToken", t);
  }, token);
}

export async function getSessionToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return (
      localStorage.getItem("guestToken") || localStorage.getItem("hostToken")
    );
  });
}

export async function clearAuthTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("guestToken");
    localStorage.removeItem("hostToken");
  });
}

export async function acceptConsent(page: Page): Promise<void> {
  const acceptButton = page.locator(
    '[data-testid="accept-consent"], button:has-text("Aceitar"), button:has-text("Continuar")'
  ).first();

  if (await acceptButton.isVisible({ timeout: 5000 })) {
    await acceptButton.click();
    await page.waitForLoadState("networkidle");
  }
}
