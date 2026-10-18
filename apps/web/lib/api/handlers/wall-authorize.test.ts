import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

const EVENT_ID = "11111111-1111-1111-1111-111111111111";
const GUEST_EVENT_ID = "33333333-3333-3333-3333-333333333333";
const ACCOUNT_ID = "22222222-2222-2222-2222-222222222222";

const { requireGuestSession, requireHostSession, requireHostEventRole } = vi.hoisted(() => ({
  requireGuestSession: vi.fn(),
  requireHostSession: vi.fn(),
  requireHostEventRole: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireGuestSession, requireHostSession, requireHostEventRole };
});

const { autorizarPareamento, planoDoEvento } = vi.hoisted(() => ({
  autorizarPareamento: vi.fn(),
  planoDoEvento: vi.fn(),
}));
vi.mock("@albora/db", () => ({
  autorizarPareamento,
  planoDoEvento,
  withEvent: (_p: unknown, _e: string, fn: (c: unknown) => unknown) => fn({}),
  ErroAutorizacaoDePareamento: class extends Error {
    motivo = "x";
  },
}));
vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));
vi.mock("@/lib/rate-limit-store", () => ({
  consume: () => ({ allowed: true, resetInSeconds: 0 }),
}));

const { POST } = await import("./wall-authorize");

function req(body: unknown) {
  return new Request("https://exemplo.test/api/wall/authorize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  planoDoEvento.mockResolvedValue("celebration");
  autorizarPareamento.mockResolvedValue(undefined);
});

describe("POST /api/wall/authorize", () => {
  it("anfitrião com sessão de painel liga o telão sem sessão de convidado", async () => {
    requireHostSession.mockResolvedValue({ host: { accountId: ACCOUNT_ID } });
    requireHostEventRole.mockResolvedValue({ evento: { id: EVENT_ID }, role: "owner" });

    const res = await POST(req({ codigo: "A2C4E6", eventoId: EVENT_ID }));

    expect(res.status).toBe(200);
    expect(requireGuestSession).not.toHaveBeenCalled();
    expect(requireHostEventRole).toHaveBeenCalledWith(ACCOUNT_ID, EVENT_ID, expect.any(Array));
    expect(autorizarPareamento).toHaveBeenCalledWith({}, "A2C4E6", EVENT_ID, "1", expect.any(Date));
  });

  it("anfitrião sem sessão de painel recebe 401 e nada é autorizado", async () => {
    requireHostSession.mockResolvedValue(new Response(null, { status: 401 }));
    const res = await POST(req({ codigo: "A2C4E6", eventoId: EVENT_ID }));
    expect(res.status).toBe(401);
    expect(autorizarPareamento).not.toHaveBeenCalled();
  });

  it("evento de outro anfitrião é recusado e o evento da sessão de convidado não vaza", async () => {
    requireHostSession.mockResolvedValue({ host: { accountId: ACCOUNT_ID } });
    requireHostEventRole.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await POST(req({ codigo: "A2C4E6", eventoId: EVENT_ID }));
    expect(res.status).toBe(404);
    expect(autorizarPareamento).not.toHaveBeenCalled();
  });

  it("eventoId que não é UUID é 404 antes de qualquer sessão", async () => {
    const res = await POST(req({ codigo: "A2C4E6", eventoId: "x" }));
    expect(res.status).toBe(404);
    expect(requireHostSession).not.toHaveBeenCalled();
  });

  it("plano free continua recusado no caminho do anfitrião", async () => {
    requireHostSession.mockResolvedValue({ host: { accountId: ACCOUNT_ID } });
    requireHostEventRole.mockResolvedValue({ evento: { id: EVENT_ID }, role: "owner" });
    planoDoEvento.mockResolvedValue("free");
    const res = await POST(req({ codigo: "A2C4E6", eventoId: EVENT_ID }));
    expect(res.status).toBe(403);
    expect(autorizarPareamento).not.toHaveBeenCalled();
  });

  it("sem eventoId segue pela sessão de convidado, com o evento da sessão", async () => {
    requireGuestSession.mockResolvedValue({
      session: { eventoId: GUEST_EVENT_ID, sessaoId: "s1" },
      rateLimitKey: "k",
    });
    const res = await POST(req({ codigo: "A2C4E6" }));
    expect(res.status).toBe(200);
    expect(requireHostSession).not.toHaveBeenCalled();
    expect(autorizarPareamento).toHaveBeenCalledWith({}, "A2C4E6", GUEST_EVENT_ID, "1", expect.any(Date));
  });
});
