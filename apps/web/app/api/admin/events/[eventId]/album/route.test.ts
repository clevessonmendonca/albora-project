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

const db = vi.hoisted(() => ({
  withEvent: vi.fn(async (_p: unknown, _e: string, fn: (c: unknown) => unknown) =>
    fn({ query: async () => ({ rows: [{ id: "s1", display_name: "Bia" }] }) }),
  ),
  listarMidiaDoAlbum: vi.fn(),
  janelaDoAlbum: vi.fn(),
  eventPack: vi.fn(),
  eventTokens: vi.fn(),
}));
vi.mock("@albora/db", () => ({
  ...db,
  destacarMidiaDoHost: vi.fn(),
  definirCapsulaDeMemoria: vi.fn(),
  marcarAlbumVisto: vi.fn(),
  ocultarMidiaDoHost: vi.fn(),
  reexibirMidiaDoHost: vi.fn(),
  removerMidiaDoHost: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));
vi.mock("@/lib/r2", () => ({ assinarGet: vi.fn(async (k: string) => `https://r2/${k}`) }));
vi.mock("@/lib/rate-limit-store", () => ({ consume: vi.fn(() => ({ allowed: true, resetInSeconds: 0 })) }));

const { GET } = await import("./route");

function midia(id: string, quando: string) {
  return {
    id,
    sessaoId: "s1",
    missaoId: null,
    lugarId: null,
    capturadaEm: new Date(quando),
    recebidaEm: new Date(quando),
    reacoes: 0,
    destacadaEm: null,
    chaveThumb: `t/${id}`,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireHostSession.mockResolvedValue({ host: { accountId: ACCOUNT_ID } });
  requireHostEvent.mockResolvedValue({});
  db.janelaDoAlbum.mockResolvedValue({
    comecaEm: new Date("2026-09-20T20:00:00Z"),
    terminaEm: new Date("2026-09-21T00:00:00Z"),
    offsetMinutos: -180,
  });
  db.eventPack.mockResolvedValue("celebracao");
  db.eventTokens.mockResolvedValue({
    momentos: [
      { id: "m-a", titulo: "Brinde" },
      { id: "m-b", titulo: "Pista" },
    ],
  });
});

describe("GET álbum do anfitrião", () => {
  it("liga cada foto ao momento editado do evento e devolve pessoas com nome", async () => {
    db.listarMidiaDoAlbum.mockResolvedValue([
      midia("f1", "2026-09-20T20:30:00Z"),
      midia("f2", "2026-09-20T23:30:00Z"),
    ]);
    const r = await GET(new Request(`https://x.test/api/admin/events/${EVENT_ID}/album`), {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });
    const corpo = (await r.json()) as { momentos: unknown; itens: { momentoId: string }[]; pessoas: unknown };
    expect(corpo.momentos).toEqual([
      { id: "m-a", titulo: "Brinde" },
      { id: "m-b", titulo: "Pista" },
    ]);
    expect(corpo.itens.map((i: { momentoId: string }) => i.momentoId)).toEqual(["m-a", "m-b"]);
    expect(corpo.pessoas).toEqual([{ id: "s1", nome: "Bia", fotos: 2 }]);
  });
});
