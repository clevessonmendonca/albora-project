import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequireGuestSession = vi.fn();
const mockRequireConfig = vi.fn();
const mockJsonOk = vi.fn((body, init) => Response.json(body, init));
const mockErrorResponse = vi.fn((status, code, message, extra) =>
  Response.json({ code, message, ...extra }, { status }),
);
const mockUnexpectedError = vi.fn(() => Response.json({ code: "erro.interno" }, { status: 500 }));
const mockParseJsonBody = vi.fn();
const mockParseFourDigitCode = vi.fn();
const mockParsePassagemToken = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockSessionCookieHeader = vi.fn(() => "albora_sessao=x; Path=/; HttpOnly");
const mockConsume = vi.fn();

const mockCriarCodigo = vi.fn();
const mockResgatarCodigo = vi.fn();
const mockResgatarPassagem = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    requireGuestSession: mockRequireGuestSession,
    requireConfig: mockRequireConfig,
    jsonOk: mockJsonOk,
    errorResponse: mockErrorResponse,
    unexpectedError: mockUnexpectedError,
    parseJsonBody: mockParseJsonBody,
    parseFourDigitCode: mockParseFourDigitCode,
    parsePassagemToken: mockParsePassagemToken,
    enforceRateLimit: mockEnforceRateLimit,
    sessionCookieHeader: mockSessionCookieHeader,
  };
});

vi.mock("@/lib/config", () => ({
  config: () => ({
    sessionSecret: "um-segredo-de-teste-com-mais-de-32-caracteres",
    duracaoSessaoHoras: 48,
  }),
}));

vi.mock("@/lib/db", () => ({
  getPool: vi.fn(() => ({})),
}));

vi.mock("@/lib/rate-limit-store", () => ({
  consume: mockConsume,
}));

vi.mock("@albora/db", () => ({
  criarCodigoPareamentoApp: mockCriarCodigo,
  resgatarCodigoPareamentoApp: mockResgatarCodigo,
  resgatarPassagemPareamentoApp: mockResgatarPassagem,
  ErroResgateDePareamento: class ErroResgateDePareamento extends Error {
    constructor(readonly motivo: string) {
      super(motivo);
    }
  },
}));

const { postPairCode, postRedeemPairCode } = await import("./app-pair");

const sessaoBase = { eventoId: "ev-1", sessaoId: "sess-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireConfig.mockReturnValue(null);
  mockRequireGuestSession.mockResolvedValue({ session: sessaoBase, rateLimitKey: "k" });
  mockConsume.mockReturnValue({ allowed: true, resetInSeconds: 0 });
  mockEnforceRateLimit.mockReturnValue(null);
});

describe("POST /api/app/parear", () => {
  it("devolve codigo e passagem one-shot", async () => {
    const expira = new Date("2026-08-22T15:00:00.000Z");
    mockCriarCodigo.mockResolvedValue({
      code: "1234",
      expiraEm: expira,
      passagem: "tok.en",
    });

    await postPairCode(new Request("http://localhost/api/app/parear", { method: "POST" }));

    expect(mockCriarCodigo).toHaveBeenCalledWith(
      {},
      "um-segredo-de-teste-com-mais-de-32-caracteres",
      "ev-1",
      "sess-1",
      expect.any(Date),
    );
    expect(mockJsonOk).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: "1234",
        passagem: "tok.en",
        validadeMinutos: 15,
      }),
    );
  });
});

describe("POST /api/app/parear/resgatar", () => {
  it("resgata por passagem quando enviada", async () => {
    mockParseJsonBody.mockResolvedValue({ data: { passagem: "tokenABC123" } });
    mockParsePassagemToken.mockReturnValue("tokenABC123");
    mockResgatarPassagem.mockResolvedValue({
      slug: "festa-demo",
      sessaoId: "sess-1",
      token: "abc.def",
      eventoId: "ev-1",
    });

    await postRedeemPairCode(
      new Request("http://localhost/api/app/parear/resgatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passagem: "tokenABC123" }),
      }),
    );

    expect(mockResgatarPassagem).toHaveBeenCalled();
    expect(mockResgatarCodigo).not.toHaveBeenCalled();
    expect(mockJsonOk).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "festa-demo", token: "abc.def" }),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("cai no codigo de 4 digitos quando passagem ausente", async () => {
    mockParseJsonBody.mockResolvedValue({ data: { codigo: "1234" } });
    mockParseFourDigitCode.mockReturnValue("1234");
    mockResgatarCodigo.mockResolvedValue({
      slug: "festa-demo",
      sessaoId: "sess-1",
      token: "abc.def",
      eventoId: "ev-1",
    });

    await postRedeemPairCode(
      new Request("http://localhost/api/app/parear/resgatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo: "1234" }),
      }),
    );

    expect(mockResgatarCodigo).toHaveBeenCalled();
    expect(mockResgatarPassagem).not.toHaveBeenCalled();
  });
});
