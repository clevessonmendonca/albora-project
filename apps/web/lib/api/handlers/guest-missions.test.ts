import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequireGuestSession = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockRejectGuestEventQueryMismatch = vi.fn();
const mockJsonOk = vi.fn((body) => Response.json(body));
const mockUnexpectedError = vi.fn(() => Response.json({ code: "erro.interno" }, { status: 500 }));
const mockWithEvent = vi.fn();
const mockListChallenges = vi.fn();
const mockPackDoEvento = vi.fn();

vi.mock("@/lib/api", () => ({
  requireGuestSession: mockRequireGuestSession,
  enforceRateLimit: mockEnforceRateLimit,
  rejectGuestEventQueryMismatch: mockRejectGuestEventQueryMismatch,
  jsonOk: mockJsonOk,
  unexpectedError: mockUnexpectedError,
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  listChallenges: mockListChallenges,
  packDoEvento: mockPackDoEvento,
}));

vi.mock("@/lib/db", () => ({
  getPool: vi.fn(() => ({})),
}));

vi.mock("@albora/packs", () => ({
  PACKS: {
    casamento: { id: "casamento", vocabulary: {} },
  },
  resolvePackText: vi.fn((_pack, chave: string) => `Resolvido: ${chave}`),
}));

const { GET } = await import("./guest-missions");

const sessaoBase = {
  eventoId: "ev-1",
  sessaoId: "sess-1",
};

function makeRequest(eventoId = "ev-1"): Request {
  return new Request(`http://localhost/api/missions?eventoId=${eventoId}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnforceRateLimit.mockReturnValue(null);
  mockRejectGuestEventQueryMismatch.mockReturnValue(null);
  mockRequireGuestSession.mockResolvedValue({ session: sessaoBase, rateLimitKey: "k" });
  mockWithEvent.mockImplementation(async (_pool, _id, fn: (c: unknown) => unknown) =>
    fn({}),
  );
  mockListChallenges.mockResolvedValue([]);
  mockPackDoEvento.mockResolvedValue(null);
});

describe("GET /api/missions", () => {
  it("retorna lista vazia quando não há desafios", async () => {
    mockListChallenges.mockResolvedValue([]);

    await GET(makeRequest());

    expect(mockJsonOk).toHaveBeenCalledWith({ missoes: [] });
  });

  it("resolve título pelo pack quando packId presente", async () => {
    mockListChallenges.mockResolvedValue([
      { id: "d1", chaveTitulo: "missao.primeira_danca", tituloCustom: null, emoji: null, ordem: 1, feito: false },
    ]);
    mockPackDoEvento.mockResolvedValue("casamento");

    await GET(makeRequest());

    expect(mockJsonOk).toHaveBeenCalledWith({
      missoes: [
        {
          id: "d1",
          titulo: "Resolvido: missao.primeira_danca",
          emoji: null,
          feito: false,
        },
      ],
    });
  });

  it("usa chaveTitulo como fallback quando packId nulo", async () => {
    mockListChallenges.mockResolvedValue([
      { id: "d2", chaveTitulo: "missao.selfie_noivos", tituloCustom: null, emoji: null, ordem: 1, feito: true },
    ]);
    mockPackDoEvento.mockResolvedValue(null);

    await GET(makeRequest());

    expect(mockJsonOk).toHaveBeenCalledWith({
      missoes: [{ id: "d2", titulo: "missao.selfie_noivos", emoji: null, feito: true }],
    });
  });

  it("retorna 401 quando sessão inválida", async () => {
    const mockResponse = Response.json({ code: "sessao.invalida" }, { status: 401 });
    mockRequireGuestSession.mockResolvedValue(mockResponse);

    const res = await GET(makeRequest());

    expect(res).toBe(mockResponse);
    expect(mockJsonOk).not.toHaveBeenCalled();
  });

  it("retorna 403 quando evento divergente", async () => {
    const mockResponse = Response.json({ code: "missoes.evento_divergente" }, { status: 403 });
    mockRejectGuestEventQueryMismatch.mockReturnValue(mockResponse);

    const res = await GET(makeRequest("ev-outro"));

    expect(res).toBe(mockResponse);
    expect(mockJsonOk).not.toHaveBeenCalled();
  });

  it("retorna erro interno em caso de exceção", async () => {
    mockWithEvent.mockRejectedValue(new Error("db error"));

    await GET(makeRequest());

    expect(mockUnexpectedError).toHaveBeenCalledWith("missoes.guest", expect.any(Error));
  });

  it("propaga campo feito corretamente", async () => {
    mockListChallenges.mockResolvedValue([
      { id: "d1", chaveTitulo: "m1", tituloCustom: null, emoji: null, ordem: 1, feito: true },
      { id: "d2", chaveTitulo: "m2", tituloCustom: null, emoji: null, ordem: 2, feito: false },
    ]);

    await GET(makeRequest());

    const call = mockJsonOk.mock.calls[0]?.[0] as { missoes: { feito: boolean }[] };
    expect(call?.missoes[0]?.feito).toBe(true);
    expect(call?.missoes[1]?.feito).toBe(false);
  });
});
