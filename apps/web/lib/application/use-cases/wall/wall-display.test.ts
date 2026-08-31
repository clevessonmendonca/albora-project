/**
 * Testes: Wall Display Use Cases
 * 
 * Cobertura:
 * - getWallFeed: busca feed de fotos para telão
 * - getWallTheme: carrega tema do evento
 * - toggleWallPanic: alterna modo pânico
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getWallFeed, GET_TTL_SECONDS } from "./get-wall-feed";
import { getWallTheme } from "./get-wall-theme";
import { toggleWallPanic } from "./toggle-wall-panic";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockLerModeracaoDoEvento,
  mockListarMidiaDaParede,
  mockAlterarnarPanicoDoEvento,
  mockAssinarGet,
  mockWallDisplayRotationModels,
  mockResolveTokens,
  mockToVariables,
  PACKS,
  ALBORA_BRAND,
} = vi.hoisted(() => ({
  mockWithEvent: vi.fn(),
  mockLerModeracaoDoEvento: vi.fn(),
  mockListarMidiaDaParede: vi.fn(),
  mockAlterarnarPanicoDoEvento: vi.fn(),
  mockAssinarGet: vi.fn(),
  mockWallDisplayRotationModels: vi.fn(),
  mockResolveTokens: vi.fn(),
  mockToVariables: vi.fn(),
  PACKS: {
    casamento: { tokens: {} },
  },
  ALBORA_BRAND: {},
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  lerModeracaoDoEvento: mockLerModeracaoDoEvento,
  listarMidiaDaParede: mockListarMidiaDaParede,
  alternarPanicoDoEvento: mockAlterarnarPanicoDoEvento,
}));

vi.mock("@/lib/r2", () => ({
  assinarGet: mockAssinarGet,
}));

vi.mock("@albora/core", () => ({
  wallDisplayRotationModels: mockWallDisplayRotationModels,
}));

vi.mock("@albora/packs", () => ({
  PACKS,
}));

vi.mock("@albora/tokens", () => ({
  ALBORA_BRAND,
  resolveTokens: mockResolveTokens,
  toVariables: mockToVariables,
}));

describe("getWallFeed", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    mockAssinarGet.mockImplementation(async (key: string) => `https://r2.example.com/${key}`);
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    ...overrides,
  });

  it("deve retornar feed com fotos", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn({
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{ identity_tokens: { telaoModelos: "grade" } }],
        })
        .mockResolvedValueOnce({
          rows: [{ fotos: 100, convidados: 25 }],
        }),
    }));
    mockLerModeracaoDoEvento.mockResolvedValue({ panico: false });
    mockListarMidiaDaParede.mockResolvedValue([
      {
        id: "m1",
        autor: "João",
        mime: "image/jpeg",
        criadaEm: new Date("2026-08-28T10:00:00Z"),
        reacoes: 5,
        chaveThumb: "thumb1.jpg",
        chaveFull: "full1.jpg",
        largura: 1920,
        altura: 1080,
      },
    ]);
    mockWallDisplayRotationModels.mockReturnValue(["grid"]);

    const input = createInput();
    const result = await getWallFeed(input, mockPool);

    expect(result.itens).toHaveLength(1);
    expect(result.itens[0]!.id).toBe("m1");
    expect(result.itens[0]!.autor).toBe("João");
    expect(result.itens[0]!.reacoes).toBe(5);
    expect(result.panico).toBe(false);
    expect(result.telaoModelos).toEqual(["grid"]);
    expect(result.contadores.fotos).toBe(100);
    expect(result.contadores.convidados).toBe(25);
  });

  it("deve calcular expiraEm corretamente", async () => {
    const beforeCall = Date.now();
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ identity_tokens: {} }] })
        .mockResolvedValueOnce({ rows: [{ fotos: 0, convidados: 0 }] }),
    }));
    mockLerModeracaoDoEvento.mockResolvedValue({ panico: false });
    mockListarMidiaDaParede.mockResolvedValue([]);
    mockWallDisplayRotationModels.mockReturnValue([]);

    const input = createInput();
    const result = await getWallFeed(input, mockPool);

    const diff = result.expiraEm - beforeCall;
    const expected = GET_TTL_SECONDS * 1000;

    expect(diff).toBeGreaterThanOrEqual(expected - 100);
    expect(diff).toBeLessThanOrEqual(expected + 100);
  });

  it("deve retornar feed vazio quando não há fotos", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ identity_tokens: {} }] })
        .mockResolvedValueOnce({ rows: [{ fotos: 0, convidados: 0 }] }),
    }));
    mockLerModeracaoDoEvento.mockResolvedValue({ panico: false });
    mockListarMidiaDaParede.mockResolvedValue([]);
    mockWallDisplayRotationModels.mockReturnValue([]);

    const input = createInput();
    const result = await getWallFeed(input, mockPool);

    expect(result.itens).toHaveLength(0);
    expect(result.contadores.fotos).toBe(0);
    expect(result.contadores.convidados).toBe(0);
  });

  it("deve incluir modo pânico", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ identity_tokens: {} }] })
        .mockResolvedValueOnce({ rows: [{ fotos: 50, convidados: 10 }] }),
    }));
    mockLerModeracaoDoEvento.mockResolvedValue({ panico: true });
    mockListarMidiaDaParede.mockResolvedValue([]);
    mockWallDisplayRotationModels.mockReturnValue([]);

    const input = createInput();
    const result = await getWallFeed(input, mockPool);

    expect(result.panico).toBe(true);
  });
});

describe("getWallTheme", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    ...overrides,
  });

  it("deve retornar tema do evento", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            pack_id: "casamento",
            identity_tokens: { primary: "var(--color-primary)" },
          },
        ],
      }),
    }));
    mockResolveTokens.mockReturnValue({
      primary: "var(--color-primary)",
      fundo: "escuro",
    });
    mockToVariables.mockReturnValue({
      "--color-primary": "var(--color-primary)",
      "--color-fundo": "var(--color-background)",
    });

    const input = createInput();
    const result = await getWallTheme(input, mockPool);

    expect(result).toEqual({
      "--color-primary": "var(--color-primary)",
      "--color-fundo": "var(--color-background)",
    });
  });

  it("deve usar pack tokens quando disponível", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            pack_id: "casamento",
            identity_tokens: {},
          },
        ],
      }),
    }));
    mockResolveTokens.mockReturnValue({ fundo: "escuro" });
    mockToVariables.mockReturnValue({ "--color-fundo": "var(--color-background)" });

    const input = createInput();
    await getWallTheme(input, mockPool);

    expect(mockResolveTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        pack: expect.objectContaining({ fundo: "escuro" }),
      }),
    );
  });

  it("deve funcionar sem pack_id", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn({
      query: vi.fn().mockResolvedValue({
        rows: [{ pack_id: null, identity_tokens: {} }],
      }),
    }));
    mockResolveTokens.mockReturnValue({ fundo: "escuro" });
    mockToVariables.mockReturnValue({ "--color-fundo": "var(--color-background)" });

    const input = createInput();
    await getWallTheme(input, mockPool);

    expect(mockResolveTokens).toHaveBeenCalled();
  });
});

describe("toggleWallPanic", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    ...overrides,
  });

  it("deve alternar pânico para true", async () => {
    mockAlterarnarPanicoDoEvento.mockResolvedValue(true);

    const input = createInput();
    const result = await toggleWallPanic(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.panico).toBe(true);
    }
  });

  it("deve alternar pânico para false", async () => {
    mockAlterarnarPanicoDoEvento.mockResolvedValue(false);

    const input = createInput();
    const result = await toggleWallPanic(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.panico).toBe(false);
    }
  });

  it("deve retornar erro quando evento não encontrado", async () => {
    mockAlterarnarPanicoDoEvento.mockResolvedValue(null);

    const input = createInput();
    const result = await toggleWallPanic(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("evento.nao_encontrado");
    }
  });
});
