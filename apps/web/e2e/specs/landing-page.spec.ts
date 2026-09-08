/**
 * Teste E2E: Landing Page do Evento
 *
 * Valida que a landing page carrega corretamente e exibe informações do evento.
 */

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
    // 1. Setup: Cria evento de teste
    const event = await setupTestEvent({
      slug: `test-landing-${Date.now()}`,
      packId: "casamento",
    });

    try {
      // 2. Navega para a landing page do evento (via /e/ direto, sem redirect)
      await page.goto(`/e/${event.slug}`);

      // 3. Aguarda a página carregar
      await page.waitForLoadState("networkidle");

      // 4. Valida que a página carregou (não é 404)
      await expect(page).not.toHaveTitle(/404/i);

      // 5. Valida que a URL contém /e/{slug}
      expect(page.url()).toContain(`/e/${event.slug}`);

      // 6. Valida que há conteúdo visível na página
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // 7. (Opcional) Verifica se há algum heading visível
      const headings = page.locator("h1, h2, h3");
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      console.log(`✅ Landing page carregou para evento: ${event.slug}`);
    } finally {
      // Cleanup: Remove evento de teste
      await cleanupTestEvent(event.id);
    }
  });

  test("evento inexistente manda reescanear, não é beco genérico", async ({ page }) => {
    // 1. Navega direto para /e/ com slug inexistente (sem redirect do [slug])
    const response = await page.goto("/e/evento-que-nao-existe-12345");

    /*
     * 2. O que se cobra aqui é a mensagem, não o código HTTP. O status é 200
     * porque `app/loading.tsx` — o do segmento RAIZ — envolve a aplicação
     * inteira em Suspense: sob streaming o Next já mandou os headers quando o
     * componente lança, e nenhum `notFound()` do projeto vira 404. Remover
     * `app/e/[slug]/loading.tsx` não muda nada enquanto o da raiz existir;
     * medido contra build de produção, e contra uma app Next 15.5.23 mínima,
     * que devolve 404 até o instante em que ganha um `loading` na raiz.
     *
     * Nesta superfície o status não pesa: `robots.txt` faz `Disallow: /e/`,
     * ela está fora do sitemap e cada página declara
     * `robots: { index: false, follow: false }`. Chega-se por QR, nunca por
     * crawler. Não reintroduza `expect(status).toBe(404)` aqui: cobra do
     * framework o que ele não entrega sob streaming e esconde a asserção que
     * importa.
     *
     * O mesmo NÃO vale para `/p/[slug]`, que é indexável (`Allow: /p/`) e hoje
     * também responde 200 para slug morto. Esse caso é de crawler de verdade e
     * segue em aberto — não é coberto por este teste.
     */
    expect(response?.ok()).toBe(true);

    // 3. A tela do convidado, não a global: QR com letra trocada tem saída.
    await expect(page.getByText(/esse endereço não abre nenhuma festa/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /escanear o qr/i })).toBeVisible();
  });

  test("deve persistir evento no banco de dados", async () => {
    // 1. Cria evento
    const event = await setupTestEvent({
      slug: `test-db-${Date.now()}`,
    });

    try {
      // 2. Busca o evento pelo slug
      const foundEvent = await getEventBySlug(event.slug);

      // 3. Valida que foi encontrado
      expect(foundEvent).not.toBeNull();
      expect(foundEvent?.id).toBe(event.id);
      expect(foundEvent?.slug).toBe(event.slug);
      expect(foundEvent?.packId).toBe("casamento");

      console.log(`✅ Evento persistido no DB: ${event.slug}`);
    } finally {
      // Cleanup
      await cleanupTestEvent(event.id);
    }
  });
});
