import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

const ACCOUNT_ID = "22222222-2222-2222-2222-222222222222";
const VENDOR_ID = "11111111-1111-1111-1111-111111111111";

const { requireConfig, requireHostSession } = vi.hoisted(() => ({
  requireConfig: vi.fn(() => null),
  requireHostSession: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireConfig, requireHostSession };
});

const {
  criarFornecedor,
  fornecedorParaConta,
  atualizarFornecedor,
  ErroDadosDeFornecedorInvalidos,
  ErroSlugDeFornecedorEmUso,
} = vi.hoisted(() => ({
  criarFornecedor: vi.fn(),
  fornecedorParaConta: vi.fn(),
  atualizarFornecedor: vi.fn(),
  ErroDadosDeFornecedorInvalidos: class ErroDadosDeFornecedorInvalidos extends Error {
    readonly code = "vendor.dados_invalidos";
    campos: string[];
    constructor(campos: string[]) {
      super("invalidos");
      this.campos = campos;
    }
  },
  ErroSlugDeFornecedorEmUso: class ErroSlugDeFornecedorEmUso extends Error {
    readonly code = "vendor.slug_em_uso";
    constructor(readonly slug: string) {
      super("em uso");
    }
  },
}));

vi.mock("@albora/db", () => ({
  criarFornecedor,
  fornecedorParaConta,
  atualizarFornecedor,
  ErroDadosDeFornecedorInvalidos,
  ErroSlugDeFornecedorEmUso,
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({}),
  getAggregatorPool: () => ({}),
}));

vi.mock("@/features/vendor-portal/lib/audit", () => ({
  auditarAgregacaoDoPortal: vi.fn(),
}));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { POST, GET, PATCH } = await import("./admin-vendor");

function params() {
  return { params: Promise.resolve({ vendorId: VENDOR_ID }) };
}

function postReq(body: unknown) {
  return new Request("https://exemplo.test/api/admin/vendor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq() {
  return new Request(`https://exemplo.test/api/admin/vendor/${VENDOR_ID}`);
}

function patchReq(body: unknown) {
  return new Request(`https://exemplo.test/api/admin/vendor/${VENDOR_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireHostSession.mockResolvedValue({
    host: { accountId: ACCOUNT_ID, email: "admin@exemplo.test" },
  });
  consume.mockReturnValue({ allowed: true, remaining: 9, resetInSeconds: 60 });
});

describe("POST /api/admin/vendor", () => {
  it("cria com sucesso: 201 com vendorId/slug", async () => {
    criarFornecedor.mockResolvedValue({ vendorId: VENDOR_ID, slug: "buffet-da-serra" });

    const res = await POST(postReq({ name: "Buffet da Serra", slug: "buffet-da-serra" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { vendorId: string; slug: string };
    expect(body).toEqual({ vendorId: VENDOR_ID, slug: "buffet-da-serra" });
    expect(criarFornecedor).toHaveBeenCalledWith(
      {},
      ACCOUNT_ID,
      { name: "Buffet da Serra", slug: "buffet-da-serra" },
      expect.any(Function),
    );
  });

  it("sem sessão: 401, sem chamar o banco", async () => {
    requireHostSession.mockResolvedValue(
      Response.json({ code: "admin.sem_sessao" }, { status: 401 }),
    );
    const res = await POST(postReq({ name: "X", slug: "x" }));
    expect(res.status).toBe(401);
    expect(criarFornecedor).not.toHaveBeenCalled();
  });

  it("sem nome nem slug: 422 com os dois campos listados", async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { details: { campos: string[] } };
    expect(body.details.campos).toEqual(["name", "slug"]);
    expect(criarFornecedor).not.toHaveBeenCalled();
  });

  it("slug em uso: 409", async () => {
    criarFornecedor.mockRejectedValue(new ErroSlugDeFornecedorEmUso("buffet-x"));
    const res = await POST(postReq({ name: "Buffet X", slug: "buffet-x" }));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("vendor.slug_em_uso");
  });

  it("dados inválidos do db layer: 422 com campos", async () => {
    criarFornecedor.mockRejectedValue(new ErroDadosDeFornecedorInvalidos(["slug"]));
    const res = await POST(postReq({ name: "Ok", slug: "Ok Slug!" }));
    expect(res.status).toBe(422);
  });

  it("rate limit: 429", async () => {
    consume.mockReturnValue({ allowed: false, remaining: 0, resetInSeconds: 30 });
    const res = await POST(postReq({ name: "X", slug: "x" }));
    expect(res.status).toBe(429);
    expect(criarFornecedor).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/vendor/[vendorId]", () => {
  it("membro lê o fornecedor: 200", async () => {
    fornecedorParaConta.mockResolvedValue({
      id: VENDOR_ID,
      name: "Buffet X",
      slug: "buffet-x",
      plan: "starter",
      status: "trial",
      brandTokens: {},
      role: "admin",
    });
    const res = await GET(getReq(), params());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { vendor: { id: string } };
    expect(body.vendor.id).toBe(VENDOR_ID);
  });

  it("sem pertencimento: 404", async () => {
    fornecedorParaConta.mockResolvedValue(null);
    const res = await GET(getReq(), params());
    expect(res.status).toBe(404);
  });

  it("vendorId fora do formato UUID: 404 sem chamar o banco", async () => {
    const res = await GET(getReq(), { params: Promise.resolve({ vendorId: "nao-e-uuid" }) });
    expect(res.status).toBe(404);
    expect(fornecedorParaConta).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/vendor/[vendorId]", () => {
  it("atualiza nome com sucesso: 200", async () => {
    atualizarFornecedor.mockResolvedValue(true);
    const res = await PATCH(patchReq({ name: "Novo Nome" }), params());
    expect(res.status).toBe(200);
    expect(atualizarFornecedor).toHaveBeenCalledWith({}, ACCOUNT_ID, VENDOR_ID, {
      name: "Novo Nome",
    });
  });

  it("não encontrado / sem papel admin: 404", async () => {
    atualizarFornecedor.mockResolvedValue(false);
    const res = await PATCH(patchReq({ name: "Novo Nome" }), params());
    expect(res.status).toBe(404);
  });

  it("corpo vazio: 422, sem chamar o banco", async () => {
    const res = await PATCH(patchReq({}), params());
    expect(res.status).toBe(422);
    expect(atualizarFornecedor).not.toHaveBeenCalled();
  });

  it("slug em uso: 409", async () => {
    atualizarFornecedor.mockRejectedValue(new ErroSlugDeFornecedorEmUso("buffet-x"));
    const res = await PATCH(patchReq({ slug: "buffet-x" }), params());
    expect(res.status).toBe(409);
  });

  it("rate limit: 429", async () => {
    consume.mockReturnValue({ allowed: false, remaining: 0, resetInSeconds: 30 });
    const res = await PATCH(patchReq({ name: "X" }), params());
    expect(res.status).toBe(429);
    expect(atualizarFornecedor).not.toHaveBeenCalled();
  });
});
