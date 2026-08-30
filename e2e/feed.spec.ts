import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
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
 * semearFotosNoFeed() abre o gate depois que a sessão já entrou — o cliente
 * detecta a transição fechado→aberto (useGateTransition) e mostra o
 * GateOpenedOverlay ("A festa está liberada"), que intercepta cliques nos
 * posts por baixo até ser fechado. A detecção acontece num re-render
 * assíncrono após o mount, não no goto() em si, então um dismiss único logo
 * após a navegação pode rodar cedo demais e perder o aviso.
 */
async function fecharAvisoLiberado(page: Page): Promise<void> {
  const aviso = page.getByRole("dialog", { name: "Feed liberado" });
  if (await aviso.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await aviso.getByRole("button", { name: /ver as fotos/i }).click();
    await expect(aviso).toBeHidden({ timeout: 2_000 });
  }
}

/** Clica num post tolerando o GateOpenedOverlay aparecer entre o dismiss e o clique. */
async function clicarNoPost(page: Page, locator: ReturnType<Page["locator"]>): Promise<void> {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    await fecharAvisoLiberado(page);
    try {
      await locator.click({ timeout: 3_000 });
      return;
    } catch {
      // aviso reapareceu entre o dismiss e o clique — tenta de novo.
    }
  }
  await locator.click();
}

/**
 * O feed é compartilhado entre todas as sessões do evento — sem limpar entre
 * testes, uploads de um teste anterior aparecem no feed do próximo e mudam
 * quantos itens/grupos existem (quebra suposições como "índice 0 é o post
 * clicado").
 */
test.beforeEach(async () => {
  const url = process.env.DATABASE_URL ?? "postgres://albora:albora@localhost:55432/albora";
  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query("TRUNCATE reactions, comments, uploads, guest_sessions CASCADE");
  } finally {
    await pool.end();
  }
});

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

    // Chave precisa bater com KEY_FORMAT de app/api/media/urls/lote.ts
    // (events/{eventoId}/{aaaa}/{mm}/{uuid}/full) — senão a rota de assinatura
    // rejeita com midia.chave_invalida e o post nunca ganha <img>/<video>.
    const agora = new Date();
    const ano = agora.getUTCFullYear();
    const mes = String(agora.getUTCMonth() + 1).padStart(2, "0");

    for (let i = 0; i < quantidade; i++) {
      await pool.query(
        `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, caption, state)
         VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 12345, $4, 'published')`,
        [eventoId, sessaoId, `events/${eventoId}/${ano}/${mes}/${randomUUID()}/full`, `Foto de teste ${i + 1}`],
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
    await fecharAvisoLiberado(page);
    await expect(page.getByRole("feed", { name: "Feed de fotos" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid^="post-"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test("abre o viewer ao clicar em uma foto e fecha com Escape", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await semearFotosNoFeed(page, 1);
    await page.goto("/e/festa-demo/feed");
    await fecharAvisoLiberado(page);
    const primeiroPost = page.locator('[data-testid^="post-"]').first();
    await expect(primeiroPost).toBeVisible({ timeout: 10_000 });
    const imagem = primeiroPost.locator("img, video").first();
    // .click() rola o alvo pra dentro da viewport antes de clicar — capturar
    // scrollY antes disso deixaria a base de comparação errada (abrir() salva
    // a posição já pós-scroll-into-view).
    await imagem.scrollIntoViewIfNeeded();
    const scrollAntes = await page.evaluate(() => window.scrollY);
    await clicarNoPost(page, imagem);
    await expect(page.getByTestId("viewer")).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("viewer")).toBeHidden({ timeout: 3_000 });
    // fechar() usa window.scrollTo({ behavior: "smooth" }) — a posição só
    // estabiliza depois que a animação do browser termina, daí o poll.
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 2_000 })
      .toBeLessThan(scrollAntes + 50);
  });

  test("curte e descurte uma foto no viewer", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await semearFotosNoFeed(page, 1);
    await page.goto("/e/festa-demo/feed");
    await fecharAvisoLiberado(page);
    const primeiroPost = page.locator('[data-testid^="post-"]').first();
    await expect(primeiroPost).toBeVisible({ timeout: 10_000 });
    await clicarNoPost(page, primeiroPost.locator("img, video").first());
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
    await fecharAvisoLiberado(page);
    await expect(page.locator('[data-testid^="post-"]').first()).toBeVisible({ timeout: 10_000 });
    const totalPosts = await page.locator('[data-testid^="post-"]').count();
    if (totalPosts < 2) {
      test.skip(true, "Necessário pelo menos 2 posts");
    }
    await clicarNoPost(page, page.locator('[data-testid^="post-"]').first().locator("img, video").first());
    await expect(page.getByTestId("viewer")).toBeVisible({ timeout: 5_000 });
    // O post clicado no grid nem sempre é itens[0] do grupo (DOM e array não
    // têm necessariamente a mesma ordem) — Home garante começar no início,
    // senão ArrowRight a partir do último item fecha o viewer em vez de navegar.
    await page.keyboard.press("Home");
    // Frame também renderiza um <img> de fundo desfocado (aria-hidden, chave
    // thumb) antes da mídia principal — sem excluí-lo, .first() pega o fundo
    // em vez da foto/vídeo real exibida. A troca de índice (Home, e depois
    // ArrowRight) zera cheiaPronta/cheia até a URL da foto alvo chegar
    // (frame.tsx) — o <img> some do DOM por um instante real de carregamento,
    // não só troca de src; .count()===0 nesse meio-tempo não é falha.
    const media = page.getByTestId("viewer").locator("img:not([aria-hidden]), video");
    const lerSrc = async () => ((await media.count()) === 0 ? null : media.first().getAttribute("src"));
    // Captura o valor dentro do próprio callback do poll — lido de novo depois
    // reabriria a mesma janela de flutuação que o poll existe pra tolerar.
    let srcInicial: string | null = null;
    await expect.poll(async () => (srcInicial = await lerSrc()), { timeout: 10_000 }).not.toBeNull();
    await page.keyboard.press("ArrowRight");
    await expect.poll(lerSrc, { timeout: 10_000 }).not.toBe(srcInicial);
  });
});

test.describe("Feed do convidado — espelho", () => {
  test("abre o viewer ao tocar uma miniatura da grade", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    await entrarNoEvento(page);
    await page.goto("/e/festa-demo/feed");
    await fecharAvisoLiberado(page);
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
