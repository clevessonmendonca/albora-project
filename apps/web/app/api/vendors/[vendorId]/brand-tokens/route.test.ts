import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALBORA_BRAND, MODELOS_DE_IDENTIDADE } from "@albora/tokens";
import type * as ApiModule from "@/lib/api";

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const ACCOUNT_ID = "22222222-2222-2222-2222-222222222222";

const COR_ACENTO = ALBORA_BRAND.cores.acento;
const COR_PAPEL = ALBORA_BRAND.cores.papel;
const COR_NOITE = ALBORA_BRAND.cores.noite;
const COR_TINTA = ALBORA_BRAND.cores.tinta;
const COR_PRESET = MODELOS_DE_IDENTIDADE.find((m) => m.id === "linho")!.camada.cores!.acento!;

const { requireHostSession } = vi.hoisted(() => ({
  requireHostSession: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireHostSession };
});

const { roleForAccountOnVendor, atualizarBrandTokensDoFornecedor, ErroBrandTokensInvalidos } =
  vi.hoisted(() => ({
    roleForAccountOnVendor: vi.fn(),
    atualizarBrandTokensDoFornecedor: vi.fn(),
    ErroBrandTokensInvalidos: class ErroBrandTokensInvalidos extends Error {
      readonly code = "vendor.brand_tokens_invalidos";
      campos: string[];
      constructor(campos: string[]) {
        super("invalidos");
        this.campos = campos;
      }
    },
  }));

vi.mock("@albora/db", () => ({
  roleForAccountOnVendor,
  atualizarBrandTokensDoFornecedor,
  ErroBrandTokensInvalidos,
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({}),
}));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { PATCH } = await import("./route");

function req(body: unknown = { cores: { acento: COR_ACENTO } }) {
  return new Request(`https://exemplo.test/api/vendors/${VENDOR_ID}/brand-tokens`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params() {
  return { params: Promise.resolve({ vendorId: VENDOR_ID }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireHostSession.mockResolvedValue({
    host: { accountId: ACCOUNT_ID, email: "admin@exemplo.test" },
  });
  roleForAccountOnVendor.mockResolvedValue("admin");
  consume.mockReturnValue({ allowed: true, remaining: 19, resetInSeconds: 60 });
  atualizarBrandTokensDoFornecedor.mockResolvedValue(true);
});

describe("PATCH /api/vendors/[vendorId]/brand-tokens", () => {
  it("admin com payload válido: 200 ok", async () => {
    const res = await PATCH(req({ cores: { acento: COR_PRESET }, background: "light" }), params());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(atualizarBrandTokensDoFornecedor).toHaveBeenCalledOnce();
  });

  it("só background: 200 ok", async () => {
    const res = await PATCH(req({ background: "dark" }), params());
    expect(res.status).toBe(200);
  });

  it("staff: 403 sem chamar o banco", async () => {
    roleForAccountOnVendor.mockResolvedValue("staff");
    const res = await PATCH(req(), params());
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("vendor.papel_negado");
    expect(atualizarBrandTokensDoFornecedor).not.toHaveBeenCalled();
  });

  it("sem sessão: 401", async () => {
    requireHostSession.mockResolvedValue(
      Response.json({ code: "admin.sem_sessao" }, { status: 401 }),
    );
    const res = await PATCH(req(), params());
    expect(res.status).toBe(401);
    expect(atualizarBrandTokensDoFornecedor).not.toHaveBeenCalled();
  });

  it("vendorId inválido: 404", async () => {
    const res = await PATCH(
      req(),
      { params: Promise.resolve({ vendorId: "nao-e-uuid" }) },
    );
    expect(res.status).toBe(404);
    expect(atualizarBrandTokensDoFornecedor).not.toHaveBeenCalled();
  });

  it("sem pertencimento: 404", async () => {
    roleForAccountOnVendor.mockResolvedValue(null);
    const res = await PATCH(req(), params());
    expect(res.status).toBe(404);
    expect(atualizarBrandTokensDoFornecedor).not.toHaveBeenCalled();
  });

  it("cores.acento com hex inválido: 422 com campo listado", async () => {
    const res = await PATCH(req({ cores: { acento: "vermelho" } }), params());
    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string; details: { campos: string[] } };
    expect(body.code).toBe("validation_error");
    expect(body.details.campos).toContain("cores.acento");
    expect(atualizarBrandTokensDoFornecedor).not.toHaveBeenCalled();
  });

  it("background inválido: 422", async () => {
    const res = await PATCH(req({ background: "roxo" }), params());
    expect(res.status).toBe(422);
    const body = (await res.json()) as { details: { campos: string[] } };
    expect(body.details.campos).toContain("background");
  });

  it("body vazio (sem campos): 422", async () => {
    const res = await PATCH(req({}), params());
    expect(res.status).toBe(422);
    expect(atualizarBrandTokensDoFornecedor).not.toHaveBeenCalled();
  });

  it("rate limit: 429", async () => {
    consume.mockReturnValue({ allowed: false, remaining: 0, resetInSeconds: 30 });
    const res = await PATCH(req(), params());
    expect(res.status).toBe(429);
    expect(atualizarBrandTokensDoFornecedor).not.toHaveBeenCalled();
  });

  it("cores opcionais papel/noite/tinta: aceitas", async () => {
    const res = await PATCH(
      req({ cores: { acento: COR_ACENTO, papel: COR_PAPEL, noite: COR_NOITE, tinta: COR_TINTA } }),
      params(),
    );
    expect(res.status).toBe(200);
  });

  it("logoUrl https válida: 200 ok", async () => {
    const res = await PATCH(
      req({ logoUrl: "https://cdn.exemplo.test/logo.png" }),
      params(),
    );
    expect(res.status).toBe(200);
    expect(atualizarBrandTokensDoFornecedor).toHaveBeenCalledWith(
      {},
      ACCOUNT_ID,
      VENDOR_ID,
      expect.objectContaining({ logoUrl: "https://cdn.exemplo.test/logo.png" }),
    );
  });

  it("logoUrl sem https: 422 com o campo listado", async () => {
    const res = await PATCH(req({ logoUrl: "http://inseguro.test/logo.png" }), params());
    expect(res.status).toBe(422);
    const body = (await res.json()) as { details: { campos: string[] } };
    expect(body.details.campos).toContain("logoUrl");
    expect(atualizarBrandTokensDoFornecedor).not.toHaveBeenCalled();
  });
});
