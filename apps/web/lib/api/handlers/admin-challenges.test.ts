import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

const ACCOUNT_ID = "22222222-2222-2222-2222-222222222222";
const EVENT_ID = "11111111-1111-1111-1111-111111111111";

const { requireConfig, requireHostSession, requireHostEvent } = vi.hoisted(() => ({
  requireConfig: vi.fn(() => null),
  requireHostSession: vi.fn(),
  requireHostEvent: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireConfig, requireHostSession, requireHostEvent };
});

const { withEvent, listChallenges, substituirDesafios, substituirMissoesCustom } = vi.hoisted(
  () => ({
    withEvent: vi.fn(),
    listChallenges: vi.fn(),
    substituirDesafios: vi.fn(),
    substituirMissoesCustom: vi.fn(),
  }),
);

vi.mock("@albora/db", () => ({
  withEvent,
  listChallenges,
  substituirDesafios,
  substituirMissoesCustom,
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({}),
}));

vi.mock("@albora/packs", () => ({
  PACKS: {
    casamento: { id: "casamento", missoes: [] },
  },
}));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { GET, PUT } = await import("./admin-challenges");

function params() {
  return { params: Promise.resolve({ eventId: EVENT_ID }) };
}

function putReq(body: unknown) {
  return new Request(`https://exemplo.test/api/admin/events/${EVENT_ID}/challenges`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq() {
  return new Request(`https://exemplo.test/api/admin/events/${EVENT_ID}/challenges`);
}

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireHostSession.mockResolvedValue({
    host: { accountId: ACCOUNT_ID, email: "admin@exemplo.test" },
  });
  requireHostEvent.mockResolvedValue({ evento: { packId: "casamento" } });
  consume.mockReturnValue({ allowed: true, remaining: 29, resetInSeconds: 60 });
  withEvent.mockImplementation(async (_pool, _id, fn: (c: unknown) => unknown) => fn({}));
  listChallenges.mockResolvedValue([]);
  substituirMissoesCustom.mockResolvedValue([]);
  substituirDesafios.mockResolvedValue([]);
});

describe("PUT /api/admin/events/:eventId/challenges — prazo da missão personalizada", () => {
  it("repassa o prazo ISO tal como recebido", async () => {
    const deadline = "2026-12-31T20:00:00.000Z";

    const res = await PUT(
      putReq({ customMissions: [{ titulo: "Foto com o bolo", posicao: 1, deadline }] }),
      params(),
    );

    expect(res.status).toBe(200);
    expect(substituirMissoesCustom).toHaveBeenCalledWith(
      {},
      EVENT_ID,
      [expect.objectContaining({ titulo: "Foto com o bolo", deadline })],
    );
  });

  it("sem prazo informado, passa deadline null", async () => {
    const res = await PUT(
      putReq({ customMissions: [{ titulo: "Foto qualquer", posicao: 1 }] }),
      params(),
    );

    expect(res.status).toBe(200);
    expect(substituirMissoesCustom).toHaveBeenCalledWith(
      {},
      EVENT_ID,
      [expect.objectContaining({ deadline: null })],
    );
  });

  it("prazo inválido: 422, sem chamar o banco", async () => {
    const res = await PUT(
      putReq({ customMissions: [{ titulo: "Foto quebrada", posicao: 1, deadline: "não-é-data" }] }),
      params(),
    );

    expect(res.status).toBe(422);
    expect(substituirMissoesCustom).not.toHaveBeenCalled();
  });

  it("prazo em branco é tratado como ausente, não como inválido", async () => {
    const res = await PUT(
      putReq({ customMissions: [{ titulo: "Foto sem prazo", posicao: 1, deadline: "" }] }),
      params(),
    );

    expect(res.status).toBe(200);
    expect(substituirMissoesCustom).toHaveBeenCalledWith(
      {},
      EVENT_ID,
      [expect.objectContaining({ deadline: null })],
    );
  });
});

describe("GET /api/admin/events/:eventId/challenges — serialização do prazo", () => {
  it("inclui deadline na resposta quando presente", async () => {
    listChallenges.mockResolvedValue([
      {
        id: "d1",
        chaveTitulo: null,
        tituloCustom: "Foto com o bolo",
        emoji: "🎂",
        deadline: "2026-12-31T20:00:00.000Z",
        ordem: 1,
        feito: false,
      },
    ]);

    const res = await GET(getReq(), params());
    const body = (await res.json()) as {
      challenges: { deadline: string | null }[];
    };

    expect(body.challenges[0]?.deadline).toBe("2026-12-31T20:00:00.000Z");
  });

  it("deadline null quando a missão não tem prazo", async () => {
    listChallenges.mockResolvedValue([
      {
        id: "d1",
        chaveTitulo: "missao.pack",
        tituloCustom: null,
        emoji: null,
        deadline: null,
        ordem: 1,
        feito: false,
      },
    ]);

    const res = await GET(getReq(), params());
    const body = (await res.json()) as {
      challenges: { deadline: string | null }[];
    };

    expect(body.challenges[0]?.deadline).toBeNull();
  });
});
