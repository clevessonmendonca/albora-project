import { test, expect, type Page } from "@playwright/test";
import pg from "pg";

const E2E_FULL = !!process.env.E2E_FULL;
const SLUG = "festa-demo";

async function entrarNoEvento(page: Page, nome = "E2E Feed") {
  await page.goto(`/e/${SLUG}`);
  await page.getByPlaceholder(/tio joão/i).fill(nome);
  await page.getByRole("button", { name: /fotografar/i }).click();
  await page.waitForURL(new RegExp(`/e/${SLUG}/cover`), { waitUntil: "domcontentloaded" });
}

/**
 * `pnpm db:semear` deixa festa-demo sem nenhum upload — o feed real não tem
 * o que mostrar. Insere direto no Postgres (mesma conexão que o app usa)
 * em vez de subir de verdade: mais rápido, e o objetivo aqui é testar o
 * feed renderizando posts, não o pipeline de upload (isso já é coberto por
 * guest-flow.spec.ts).
 */
async function semearFotosNoFeed(_page: Page, quantidade: number): Promise<void> {
  const url = process.env.DATABASE_URL ?? "postgres://albora:albora@localhost:55432/albora";
  const pool = new pg.Pool({ connectionString: url });
  try {
    const eventoRes = await pool.query("SELECT id FROM events WHERE slug = $1", [SLUG]);
    const eventoId: string = eventoRes.rows[0].id;

    // festa-demo nasce com interaction_opens_at no futuro (gate fechado) —
    // o feed renderiza em modo espelho (MirrorGrid), sem os cards Post que
    // estes testes verificam. Abrir o gate pro passado põe o feed em modo
    // completo, que é o que "caminho crítico" e "navegação" testam.
    await pool.query(
      "UPDATE events SET interaction_opens_at = now() - interval '1 hour' WHERE id = $1",
      [eventoId],
    );

    // A sessão mais recente do evento é a que entrarNoEvento() acabou de criar
    // (chamada sempre logo antes desta função).
    const sessaoRes = await pool.query(
      "SELECT id FROM guest_sessions WHERE event_id = $1 ORDER BY created_at DESC LIMIT 1",
      [eventoId],
    );
    const sessaoId: string = sessaoRes.rows[0].id;

    for (let i = 0; i < quantidade; i++) {
      await pool.query(
        `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, caption, state)
         VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 12345, $4, 'published')`,
        [eventoId, sessaoId, `events/${eventoId}/e2e-feed-${i}-${Date.now()}`, `Foto de teste ${i + 1}`],
      );
    }
  } finally {
    await pool.end();
  }
}

test.describe("Feed do convidado — caminho crítico", () => {
  test("carrega o feed e exibe posts", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await semearFotosNoFeed(page, 1);
    await page.goto("/e/festa-demo/feed");
    await expect(page.getByRole("feed", { name: "Feed de fotos" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid^="post-"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test("abre o viewer ao clicar em uma foto e fecha com Escape", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await semearFotosNoFeed(page, 1);
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
    await semearFotosNoFeed(page, 1);
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
    await semearFotosNoFeed(page, 2);
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

test.describe("Feed do convidado — espelho", () => {
  test("abre o viewer ao tocar uma miniatura da grade", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await page.goto("/e/festa-demo/feed");
    const thumb = page.locator('[data-testid^="mirror-photo-"]').first();
    const temGrade = await thumb.count();
    if (temGrade === 0) {
      test.skip(true, "Evento demo já está em modo completo");
    }
    await expect(thumb).toBeVisible({ timeout: 10_000 });
    await thumb.click();
    await expect(page.getByTestId("viewer")).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("viewer")).toBeHidden({ timeout: 3_000 });
  });
});
