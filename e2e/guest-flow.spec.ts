import { test, expect, type Page } from "@playwright/test";

const E2E_FULL = !!process.env.E2E_FULL;
const SLUG = "festa-demo";

/**
 * PNG 1×1 válido de verdade (não só magic bytes) — o editor decodifica a
 * imagem no cliente via createImageBitmap antes de habilitar "Enviar", e
 * um JPEG com só SOI+APP0+EOI (sem dados de scan) falha nesse decode e
 * deixa o botão preso disabled. PNG mínimo é trivial de escrever à mão e
 * decodifica igual, então segue self-contained sem depender de fixture
 * em disco (mesmo truque do apps/web/e2e/fixtures/photo-test.jpg).
 */
const JPEG_MINIMO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Intercepta presign, PUT no storage e confirm — sem R2 real.
 * Espelha o helper equivalente em smoke.spec.ts para manter coerência.
 */
async function mockCaminhoUpload(page: Page): Promise<void> {
  await page.route("**/api/uploads/presign", async (route) => {
    const body = route.request().postDataJSON() as { uploadId?: string };
    const uploadId = body.uploadId ?? crypto.randomUUID();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uploadId,
        chave: `events/e2e-fluxo/${uploadId}`,
        full: "https://mock-r2.example/put/full",
        thumb: "https://mock-r2.example/put/thumb",
        expiraEm: Date.now() + 600_000,
      }),
    });
  });

  await page.route("https://mock-r2.example/**", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });

  await page.route("**/api/uploads/confirm", async (route) => {
    const body = route.request().postDataJSON() as { uploadId?: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ uploadId: body.uploadId, estado: "visivel" }),
    });
  });
}

test.describe("smoke — fluxo do convidado", () => {
  // Todos os testes abaixo dependem de pnpm db:semear porque a resolução do slug (/e/[slug]/page.tsx) é server-side e não interceptável via route(). A validação na CI roda com E2E_FULL=1 após o seed.

  test("chegada emocional e, após entrar, campo de nome + consentimento pré-marcado", async ({
    page,
  }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");

    await page.goto(`/e/${SLUG}`);

    // Chegada: convite emocional, sem pedir identidade ainda
    await expect(page.getByText(/você foi convidado para/i)).toBeVisible();
    await expect(page.getByPlaceholder(/tio joão/i)).toBeHidden();

    // "Entrar na festa" revela a identidade
    await page.getByRole("button", { name: /entrar na festa/i }).click();

    const campoNome = page.getByPlaceholder(/tio joão/i);
    await expect(campoNome).toBeVisible();

    // Consentimento já pré-marcado (useState(true) no EntryFlow)
    await expect(page.getByRole("checkbox")).toBeChecked();

    // Ação primária desabilitada enquanto nome está vazio
    const botaoContinuar = page.getByRole("button", { name: /continuar/i });
    await expect(botaoContinuar).toBeDisabled();

    await campoNome.fill("E2E Convidado");
    await expect(botaoContinuar).toBeEnabled();
  });

  test("recusar consentimento exibe saída e botão Voltar retorna à identidade", async ({
    page,
  }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");

    await page.goto(`/e/${SLUG}`);
    await page.getByRole("button", { name: /entrar na festa/i }).click();

    // Toca "Prefiro não" — etapa muda para "recusou"
    await page.getByRole("button", { name: /prefiro não/i }).click();
    await expect(page.getByText(/tudo bem/i)).toBeVisible();

    // "Voltar" retorna ao formulário de identidade
    await page.getByRole("button", { name: /voltar/i }).click();
    await expect(page.getByPlaceholder(/tio joão/i)).toBeVisible();
  });

  test("fluxo completo: QR → consentimento → nome → cover → foto → upload confirmado", async ({
    page,
  }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    test.setTimeout(180_000);

    await mockCaminhoUpload(page);

    // 1. Navega pela URL gerada pelo QR
    await page.goto(`/e/${SLUG}`);

    // 2. Chegada emocional → entrar na festa revela a identidade
    await page.getByRole("button", { name: /entrar na festa/i }).click();

    const campoNome = page.getByPlaceholder(/tio joão/i);
    await expect(campoNome).toBeVisible();
    await expect(page.getByRole("checkbox")).toBeChecked();

    // 3. Preenche o nome e continua
    await campoNome.fill("E2E Smoke");
    await page.getByRole("button", { name: /continuar/i }).click();

    // 4. Redireciona para o cover do evento — "load" (não "domcontentloaded")
    // garante que os bundles JS já foram baixados e o React pode hidratar;
    // sem isso o click no botão cai num <button> ainda não hidratado e o
    // router.push nunca dispara (race que apareceu quando o bundle cresceu).
    await page.waitForURL(`**/e/${SLUG}/cover`, { waitUntil: "load" });
    await expect(page.locator("body")).not.toContainText(
      /não está aberta|encerrado|esse endereço/i,
      { timeout: 15_000 },
    );

    // 5. Cover carregou — toca "Enviar foto"
    await page.getByRole("button", { name: /enviar foto/i }).click();
    await page.waitForURL(`**/e/${SLUG}/photo`, { waitUntil: "domcontentloaded" });

    // 6. Tela de captura carregou — file input de foto presente (oculto, mas
    // acessível); a tela também tem inputs de galeria (multiple) e vídeo, daí
    // o seletor precisar do par accept+capture pra não colidir com os outros.
    const fileInput = page.locator('input[type="file"][accept="image/*"][capture="environment"]');
    await expect(fileInput).toBeAttached({ timeout: 10_000 });

    // 7. Injeta o arquivo — simula o convidado escolhendo uma foto. Uma foto
    // única sempre passa pelo editor (filtro/LUT) antes do upload — só um
    // lote de vários arquivos pula direto pra fila (ver photo-page.tsx).
    await fileInput.setInputFiles({
      name: "foto-e2e.jpg",
      mimeType: "image/jpeg",
      buffer: JPEG_MINIMO,
    });

    // 8. Editor abriu — confirma o envio (Enviar fica desabilitado até a
    // prévia do LUT terminar de carregar, o click já espera isso).
    const presignPromise = page.waitForRequest("**/api/uploads/presign", {
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /^enviar$/i }).click();

    // 9. Garante que o presign foi chamado — upload foi disparado
    const req = await presignPromise;
    expect(req.method()).toBe("POST");

    // 10. Aguarda o confirm — ciclo de upload completo (presign → PUT → confirm)
    await page.waitForRequest("**/api/uploads/confirm", { timeout: 20_000 });
  });
});
