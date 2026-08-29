import { test, expect, type Page } from "@playwright/test";

const E2E_FULL = !!process.env.E2E_FULL;

async function entrarNoEvento(page: Page, nome = "E2E Feed") {
  await page.goto("/e/festa-demo");
  await page.getByPlaceholder(/tio joão/i).fill(nome);
  await page.getByRole("button", { name: /fotografar/i }).click();
  await page.waitForURL(/\/e\/festa-demo\/cover/, { waitUntil: "domcontentloaded" });
}

test.describe("Feed do convidado — caminho crítico", () => {
  test("carrega o feed e exibe posts", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await page.goto("/e/festa-demo/feed");
    await expect(page.getByRole("feed", { name: "Feed de fotos" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid^="post-"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test("abre o viewer ao clicar em uma foto e fecha com Escape", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await page.goto("/e/festa-demo/feed");
    const primeiroPost = page.locator('[data-testid^="post-"]').first();
    await expect(primeiroPost).toBeVisible({ timeout: 10_000 });
    const scrollAntes = await page.evaluate(() => window.scrollY);
    await primeiroPost.locator("img, video").first().click();
    await expect(page.getByTestId("viewer")).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("viewer")).toBeHidden({ timeout: 3_000 });
    const scrollDepois = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollDepois - scrollAntes)).toBeLessThan(50);
  });

  test("curte e descurte uma foto no viewer", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await page.goto("/e/festa-demo/feed");
    const primeiroPost = page.locator('[data-testid^="post-"]').first();
    await expect(primeiroPost).toBeVisible({ timeout: 10_000 });
    await primeiroPost.locator("img, video").first().click();
    const viewer = page.getByTestId("viewer");
    await expect(viewer).toBeVisible({ timeout: 5_000 });
    const botaoCurtir = viewer.getByTestId("like-button");
    await expect(botaoCurtir).toBeVisible();
    await botaoCurtir.click();
    await expect(botaoCurtir).toHaveAttribute("aria-pressed", "true", { timeout: 2_000 });
    await botaoCurtir.click();
    await expect(botaoCurtir).toHaveAttribute("aria-pressed", "false", { timeout: 2_000 });
  });
});

test.describe("Feed do convidado — navegação", () => {
  test("navega entre fotos no viewer com setas", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await page.goto("/e/festa-demo/feed");
    await expect(page.locator('[data-testid^="post-"]').first()).toBeVisible({ timeout: 10_000 });
    const totalPosts = await page.locator('[data-testid^="post-"]').count();
    if (totalPosts < 2) {
      test.skip(true, "Necessário pelo menos 2 posts");
    }
    await page.locator('[data-testid^="post-"]').first().locator("img, video").first().click();
    const media = page.getByTestId("viewer").locator("img, video").first();
    const srcInicial = await media.getAttribute("src");
    await page.keyboard.press("ArrowRight");
    await expect(media).not.toHaveAttribute("src", srcInicial ?? "", { timeout: 3_000 });
  });
});
