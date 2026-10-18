import { beforeEach, describe, expect, it, vi } from "vitest";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";

const mockPareamentoPorLinkValido = vi.fn();
const mockCriarPareamentoPorLink = vi.fn();
const mockRequireHostSession = vi.fn();
const mockRequireHostEvent = vi.fn();

vi.mock("@albora/db", () => ({
  pareamentoPorLinkValido: mockPareamentoPorLinkValido,
  criarPareamentoPorLink: mockCriarPareamentoPorLink,
}));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(() => ({})) }));
vi.mock("@/lib/config", () => ({
  config: () => ({ sessionSecret: SEGREDO }),
  ErroConfig: class extends Error {},
}));
vi.mock("@/lib/rate-limit-store", () => ({
  consume: vi.fn(() => ({ allowed: true, resetInSeconds: 0 })),
}));
vi.mock("@/lib/api", async () => {
  const resp = await vi.importActual("@/lib/api/response");
  const parse = await vi.importActual("@/lib/api/parse-json");
  return {
    ...(resp as object),
    ...(parse as object),
    requireConfig: () => null,
    requireHostSession: mockRequireHostSession,
    requireHostEvent: mockRequireHostEvent,
    unexpectedError: (_: string, e: unknown) => {
      throw e;
    },
    ADMIN_SESSION_REQUIRED: { code: "admin.sem_sessao", message: "Entre" },
  };
});

const { POST: abrirLink } = await import("./wall-link");
const { POST: gerarLink } = await import("./admin-wall-link");

const post = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  mockRequireHostSession.mockResolvedValue({ host: { accountId: "conta-1" } });
  mockRequireHostEvent.mockResolvedValue({ evento: { plan: "celebration" } });
});

describe("POST /api/wall/pair/link (TV abre o link)", () => {
  it("link válido: não consome e entrega o token de poll só em cookie HttpOnly", async () => {
    mockPareamentoPorLinkValido.mockResolvedValue({
      valido: true,
      expiraEm: new Date(Date.now() + 3600_000),
    });
    const res = await abrirLink(post("http://x/api/wall/pair/link", { token: "abc.def" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("albora_pareamento=abc.def");
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("link expirado, usado ou forjado: 410 e nenhum cookie", async () => {
    mockPareamentoPorLinkValido.mockResolvedValue({ valido: false });
    const res = await abrirLink(post("http://x/api/wall/pair/link", { token: "forjado" }));
    expect(res.status).toBe(410);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("corpo sem token ou com token gigante: 422 sem tocar no banco", async () => {
    for (const token of [undefined, "", "a".repeat(500), 42]) {
      const res = await abrirLink(post("http://x/api/wall/pair/link", { token }));
      expect(res.status).toBe(422);
    }
    expect(mockPareamentoPorLinkValido).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/events/:id/wall-link (anfitrião gera o link)", () => {
  const params = { params: Promise.resolve({ eventId: "ev-1" }) };
  const req = () => new Request("https://albora.test/api/admin/events/ev-1/wall-link", { method: "POST" });

  it("sem sessão de anfitrião: devolve a resposta de recusa e não cria nada", async () => {
    mockRequireHostSession.mockResolvedValue(new Response(null, { status: 401 }));
    const res = await gerarLink(req(), params);
    expect(res.status).toBe(401);
    expect(mockCriarPareamentoPorLink).not.toHaveBeenCalled();
  });

  it("evento de outro anfitrião: não cria", async () => {
    mockRequireHostEvent.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await gerarLink(req(), params);
    expect(res.status).toBe(404);
    expect(mockCriarPareamentoPorLink).not.toHaveBeenCalled();
  });

  it("plano grátis: 403 plano.telao", async () => {
    mockRequireHostEvent.mockResolvedValue({ evento: { plan: "free" } });
    const res = await gerarLink(req(), params);
    expect(res.status).toBe(403);
    expect(mockCriarPareamentoPorLink).not.toHaveBeenCalled();
  });

  it("anfitrião do plano Completo: cria para o evento da rota, devolve URL com segredo no fragmento", async () => {
    mockCriarPareamentoPorLink.mockResolvedValue({ linkToken: "tok.sig" });
    const res = await gerarLink(req(), params);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { url: string };
    expect(body.url).toBe("https://albora.test/wall-link#tok.sig");
    expect(mockCriarPareamentoPorLink.mock.calls[0]![2]).toBe("ev-1");
  });
});
