/**
 * Helpers para autenticação em testes E2E
 *
 * Gera tokens de sessão válidos para testes.
 */

import type { Page } from "@playwright/test";

/**
 * Injeta um token de sessão no localStorage do navegador
 *
 * NOTA: Por enquanto simplificado. Tokens reais requerem JWT signing.
 */
export async function injectGuestToken(
  page: Page,
  token: string
): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem("guestToken", t);
  }, token);
}

/**
 * Injeta um token de host no localStorage do navegador
 */
export async function injectHostToken(page: Page, token: string): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem("hostToken", t);
  }, token);
}

/**
 * Obtém o token de sessão atual do localStorage
 */
export async function getSessionToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return (
      localStorage.getItem("guestToken") || localStorage.getItem("hostToken")
    );
  });
}

/**
 * Remove todos os tokens de autenticação do localStorage
 */
export async function clearAuthTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("guestToken");
    localStorage.removeItem("hostToken");
  });
}

/**
 * Aceita o consentimento LGPD
 */
export async function acceptConsent(page: Page): Promise<void> {
  // Procura pelo botão de aceitar consentimento
  // Pode ser um data-testid ou texto
  const acceptButton = page.locator(
    '[data-testid="accept-consent"], button:has-text("Aceitar"), button:has-text("Continuar")'
  ).first();

  if (await acceptButton.isVisible({ timeout: 5000 })) {
    await acceptButton.click();
    await page.waitForLoadState("networkidle");
  }
}

