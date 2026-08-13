import { test, expect, type Page } from "@playwright/test";

const E2E_FULL = !!process.env.E2E_FULL;

/** JPEG 1×1 válido — o menor possível para smoke de upload. */
const MINI_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
  "base64",
);

async function entrarNoEvento(page: Page, nome = "E2E") {
  await page.goto("/e/festa-demo");
  await page.getByPlaceholder(/tio joão/i).fill(nome);
  await page.getByRole("button", { name: /fotografar/i }).click();
  await page.waitForURL(/\/e\/festa-demo\/cover/, { waitUntil: "domcontentloaded" });
}

/**
 * Intercepta presign, PUT no storage e confirm — smoke do caminho de upload
 * sem depender de R2 real.
 */
async function mockUploadPath(page: Page) {
  await page.route("**/api/uploads/presign", async (route) => {
    const body = route.request().postDataJSON() as { uploadId?: string };
    const uploadId = body.uploadId ?? crypto.randomUUID();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uploadId,
        chave: `events/smoke-e2e/${uploadId}`,
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

test.describe("smoke", () => {
  test("landing carrega com título e herói", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Albora/i);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("admin sign-in pede e-mail", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await expect(page.getByRole("heading", { name: /entrar no painel/i })).toBeVisible();
    await expect(page.getByLabel(/seu e-mail/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar link/i })).toBeDisabled();
    await page.getByLabel(/seu e-mail/i).fill("e2e@exemplo.com");
    await expect(page.getByRole("button", { name: /enviar link/i })).toBeEnabled();
  });

  test("telão carrega tela de pareamento", async ({ page }) => {
    await page.goto("/wall-display");
    await expect(page.getByText(/para ligar o telão/i)).toBeVisible();
    await expect(
      page.getByText(/no app do evento, abra as configurações/i),
    ).toBeVisible();

    if (E2E_FULL) {
      await expect(page.locator("main")).toContainText(/\d{6}/, { timeout: 15_000 });
    }
  });

  test("entrada do evento demo pede consentimento", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");

    await page.goto("/e/festa-demo");
    await expect(page.getByRole("button").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/consent|entrar|festa/i);
  });

  test("minhas carrega grade vazia após entrar", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");

    await entrarNoEvento(page);
    await page.goto("/e/festa-demo/my-photos");
    await expect(page.getByText(/minhas fotos/i)).toBeVisible();
    await expect(page.getByText(/carregando/i)).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(/suas fotos aparecem aqui/i)).toBeVisible();
    await expect(page.locator("body")).toContainText(/0 fotos/i);
  });

  test("upload mock enfileira e confirma foto", async ({ page }) => {
    test.skip(!E2E_FULL, "Requer pnpm db:semear e E2E_FULL=1");
    test.setTimeout(60_000);

    await mockUploadPath(page);
    await entrarNoEvento(page, "E2E Upload");

    await page.goto("/e/festa-demo/photo");
    await expect(page.getByRole("button", { name: /fotografar/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('input[type="file"][accept="image/*"]:not([capture])').setInputFiles({
      name: "smoke.jpg",
      mimeType: "image/jpeg",
      buffer: MINI_JPEG,
    });

    const enviar = page.getByRole("button", { name: /^enviar$/i });
    await expect(enviar).toBeEnabled({ timeout: 15_000 });
    await enviar.click();

    await expect(page.getByText(/sua foto já está subindo/i)).toBeVisible();
    await page.getByRole("button", { name: /pronto|pular/i }).first().click();

    await expect(page.getByText(/já tá no telão|já está subindo/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("aliases PT de rotas raiz redirecionam para EN", async ({ page }) => {
    const casos: [string, string][] = [
      ["/escanear", "/scan"],
      ["/telao", "/wall-display"],
      ["/parear", "/wall-pair"],
      ["/album", "/scan"],
    ];

    for (const [origem, destino] of casos) {
      await page.goto(origem);
      await expect(page).toHaveURL(new RegExp(`${destino.replace("/", "\\/")}(\\?|$)`));
    }
  });

  test("scan carrega", async ({ page }) => {
    await page.goto("/scan");
    await expect(page.locator("body")).toContainText(/festa|código|qr|link/i);
  });
});
