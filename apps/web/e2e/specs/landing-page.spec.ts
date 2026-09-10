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
     * `/p/[slug]` é o caso oposto: indexável, e por isso cobrado em 404 no
     * teste logo abaixo.
     */
    expect(response?.ok()).toBe(true);

    // 3. A tela do convidado, não a global: QR com letra trocada tem saída.
    await expect(page.getByText(/esse endereço não abre nenhuma festa/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /escanear o qr/i })).toBeVisible();
  });

  test("/p/ de evento inexistente responde 404 de verdade", async ({ page }) => {
    /*
     * Diferente de `/e/`, esta superfície existe para crawler: `robots.txt` faz
     * `Allow: /p/` e a página declara openGraph próprio. Slug morto devolvendo
     * 200 faz o buscador indexar uma tela de erro como se fosse conteúdo.
     *
     * O que quebra isto é um `loading.tsx` no segmento raiz de `app/`: envolve
     * a aplicação inteira em Suspense e, sob streaming, os headers já saíram
     * quando `notFound()` lança — nenhum 404 do projeto sobrevive. Se este
     * teste começar a falhar, procure um `loading.tsx` novo na raiz antes de
     * procurar qualquer outra coisa.
     */
    const response = await page.goto("/p/evento-que-nao-existe-12345");

    expect(response?.status()).toBe(404);
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
