import { expect, test } from "@playwright/test";
import {
  authenticateVendorE2EActor,
  cleanupVendorE2EActor,
  createVendorE2EActor,
  type VendorE2EActor,
} from "../helpers/vendor-fixture";

const MUTATION_TIMEOUT = 90_000;

test.describe("Fornecedor — onboarding até cobrança", () => {
  test.describe.configure({ timeout: 240_000 });
  test.use({ actionTimeout: 90_000 });
  let actor: VendorE2EActor;

  test.beforeEach(async ({ context }) => {
    actor = await createVendorE2EActor();
    await authenticateVendorE2EActor(context, actor);
  });

  test.afterEach(async ({ page }) => {
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await cleanupVendorE2EActor(actor);
  });

  test("cria marca, primeiro evento e assinatura no billing stub", async ({ page }) => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const vendorName = `Studio E2E ${suffix}`;
    const eventName = `Festa E2E ${suffix}`;
    const vendorSlug = `studio-e2e-${suffix}`;

    await page.goto("/admin/vendor/new?next=event&plan=studio");
    const vendorNameField = page.getByLabel("Nome do fornecedor");
    const vendorSlugField = page.getByLabel("Identificador (URL)");
    await expect(async () => {
      await vendorNameField.fill(vendorName);
      await expect(vendorSlugField).toHaveValue(vendorSlug);
    }).toPass({ timeout: 60_000 });
    const vendorCreated = page.waitForResponse(
      (response) => response.url().endsWith("/api/admin/vendor") && response.request().method() === "POST",
      { timeout: MUTATION_TIMEOUT },
    );
    await page.getByRole("button", { name: "Criar fornecedor" }).click();
    expect((await vendorCreated).status()).toBe(201);

    await expect(page.getByText(/Etapa 2 de 3/)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Claro" }).click();
    const brandSaved = page.waitForResponse(
      (response) => response.url().includes("/brand-tokens") && response.request().method() === "PATCH",
      { timeout: MUTATION_TIMEOUT },
    );
    await page.getByRole("button", { name: "Ver o próximo passo" }).click();
    expect((await brandSaved).status()).toBe(200);

    await expect(page.getByText("Tudo pronto")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Criar meu primeiro evento" }).click({ noWaitAfter: true });
    await page.waitForURL(/\/admin\/new\?.*vendor=/, { timeout: 90_000 });

    await page.getByLabel("Nome do evento", { exact: true }).fill(eventName);
    await page.getByLabel("Data").fill("2027-10-10");
    await expect(page.getByLabel("Criar sob")).toHaveValue(/.+/, { timeout: 60_000 });
    await page.getByLabel("E-mail de quem recebe o painel").fill(`casal-${suffix}@albora.test`);
    await page.getByRole("button", { name: "Tudo pronto →" }).click();

    await expect(page.getByRole("heading", { name: "Como ele aparece" })).toBeVisible({ timeout: 20_000 });
    const eventCreated = page.waitForResponse(
      (response) => response.url().endsWith("/api/admin/events") && response.request().method() === "POST",
      { timeout: MUTATION_TIMEOUT },
    );
    await page.getByRole("button", { name: "Criar evento" }).click();
    expect((await eventCreated).status()).toBe(200);
    await expect(page.getByRole("heading", { name: `${eventName} está pronto.` })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("link", { name: "Abrir portal do fornecedor" }).click();
    await expect(page.getByRole("heading", { name: "O que merece sua atenção hoje?" })).toBeVisible();
    await expect(page.getByText(eventName)).toBeVisible();

    await page.getByRole("link", { name: "Ver planos" }).click();
    await expect(page.getByRole("heading", { name: "Revise sua assinatura" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Studio/ })).toBeChecked();
    const subscriptionCreated = page.waitForResponse(
      (response) => response.url().endsWith("/subscription") && response.request().method() === "POST",
      { timeout: MUTATION_TIMEOUT },
    );
    await page.getByRole("button", { name: "Confirmar assinatura" }).click();
    expect((await subscriptionCreated).status()).toBe(200);

    await expect(page.getByRole("heading", { name: "Agora falta a confirmação do pagamento." })).toBeVisible();
    await expect(page.getByText(/ambiente está usando uma cobrança de teste/i)).toBeVisible();
  });
});
