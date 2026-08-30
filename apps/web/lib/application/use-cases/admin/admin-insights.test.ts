/**
 * Testes: Admin Insights Use Cases
 * 
 * Cobertura:
 * - getEventInsights: fotos por missão e por hora
 * - getGuestMetrics: métricas de participação e funil
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type * as AlboraCore from "@albora/core";
import { getEventInsights } from "./get-event-insights";
import { getGuestMetrics } from "./get-guest-metrics";
import type { Pool, PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockFotosPorMissao,
  mockFotosPorHora,
  mockLerMetricasAoVivo,
  mockLerFunilAgregado,
  mockListarSessoesDoHost,
  mockDecideThesis,
  mockAssinarGet,
  mockResolvePackText,
  PACKS,
} = vi.hoisted(() => ({
  mockWithEvent: vi.fn(),
  mockFotosPorMissao: vi.fn(),
  mockFotosPorHora: vi.fn(),
  mockLerMetricasAoVivo: vi.fn(),
  mockLerFunilAgregado: vi.fn(),
  mockListarSessoesDoHost: vi.fn(),
  mockDecideThesis: vi.fn(),
  mockAssinarGet: vi.fn(),
  mockResolvePackText: vi.fn(),
  PACKS: {
    wedding: { id: "wedding", name: "Casamento" },
  },
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  fotosPorMissao: mockFotosPorMissao,
  fotosPorHora: mockFotosPorHora,
  lerMetricasAoVivo: mockLerMetricasAoVivo,
  lerFunilAgregado: mockLerFunilAgregado,
  listarSessoesDoHost: mockListarSessoesDoHost,
}));

// `lerIntencao` é pura e sem dependência — mockar significaria testar o dublê.
vi.mock("@albora/core", async (importOriginal) => {
  const real = await importOriginal<typeof AlboraCore>();
  return { lerIntencao: real.lerIntencao, decideThesis: mockDecideThesis };
});

vi.mock("@albora/packs", () => ({
  PACKS,
  resolvePackText: mockResolvePackText,
}));

vi.mock("@/lib/r2", () => ({
  assinarGet: mockAssinarGet,
}));

describe("getEventInsights", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    packId: "wedding",
    fuso: "America/Sao_Paulo",
    ...overrides,
  });

  it("deve carregar insights com missões e horas", async () => {
    const missoesMock = [
      {
        challengeId: "chal-1",
        titleKey: "missao.noivos",
        customTitle: null,
        emoji: "💑",
        fotos: 25,
      },
      {
        challengeId: "chal-2",
        titleKey: null,
        customTitle: "Missão Customizada",
        emoji: "🎉",
        fotos: 10,
      },
    ];
    const horasMock = [
      { hora: "18:00", fotos: 15 },
      { hora: "19:00", fotos: 30 },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockFotosPorMissao.mockResolvedValue(missoesMock);
    mockFotosPorHora.mockResolvedValue(horasMock);
    mockResolvePackText.mockReturnValue("Foto dos Noivos");

    const input = createInput();
    const result = await getEventInsights(input, mockPool);

    expect(result.missoes).toHaveLength(2);
    expect(result.missoes[0]).toEqual({
      challengeId: "chal-1",
      titulo: "Foto dos Noivos",
      emoji: "💑",
      fotos: 25,
    });
    expect(result.missoes[1]).toEqual({
      challengeId: "chal-2",
      titulo: "Missão Customizada",
      emoji: "🎉",
      fotos: 10,
    });
    expect(result.horas).toEqual(horasMock);

    expect(mockWithEvent).toHaveBeenCalledWith(mockPool, "evt-123", expect.any(Function));
    expect(mockFotosPorMissao).toHaveBeenCalledWith(expect.anything(), "evt-123");
    expect(mockFotosPorHora).toHaveBeenCalledWith(expect.anything(), "evt-123", "America/Sao_Paulo");
  });

  it("deve retornar arrays vazios quando não há dados", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockFotosPorMissao.mockResolvedValue([]);
    mockFotosPorHora.mockResolvedValue([]);

    const input = createInput();
    const result = await getEventInsights(input, mockPool);

    expect(result.missoes).toEqual([]);
    expect(result.horas).toEqual([]);
  });

  it("deve usar custom title quando presente", async () => {
    const missaoMock = [{
      challengeId: "chal-1",
      titleKey: "missao.default",
      customTitle: "Título Customizado",
      emoji: null,
      fotos: 5,
    }];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockFotosPorMissao.mockResolvedValue(missaoMock);
    mockFotosPorHora.mockResolvedValue([]);

    const input = createInput();
    const result = await getEventInsights(input, mockPool);

    expect(result.missoes[0]!.titulo).toBe("Título Customizado");
    expect(mockResolvePackText).not.toHaveBeenCalled();
  });

  it("deve usar titleKey do pack quando não há custom title", async () => {
    const missaoMock = [{
      challengeId: "chal-1",
      titleKey: "missao.brinde",
      customTitle: null,
      emoji: "🥂",
      fotos: 8,
    }];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockFotosPorMissao.mockResolvedValue(missaoMock);
    mockFotosPorHora.mockResolvedValue([]);
    mockResolvePackText.mockReturnValue("Brinde");

    const input = createInput();
    const result = await getEventInsights(input, mockPool);

    expect(result.missoes[0]!.titulo).toBe("Brinde");
    expect(mockResolvePackText).toHaveBeenCalledWith(PACKS.wedding, "missao.brinde");
  });

  it("deve funcionar sem packId", async () => {
    const missaoMock = [{
      challengeId: "chal-1",
      titleKey: "missao.test",
      customTitle: null,
      emoji: null,
      fotos: 3,
    }];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockFotosPorMissao.mockResolvedValue(missaoMock);
    mockFotosPorHora.mockResolvedValue([]);

    const input = createInput({ packId: null });
    const result = await getEventInsights(input, mockPool);

    expect(result.missoes[0]!.titulo).toBe("missao.test");
  });

  it("deve usar titleKey vazio quando não há título", async () => {
    const missaoMock = [{
      challengeId: "chal-1",
      titleKey: null,
      customTitle: null,
      emoji: "📷",
      fotos: 12,
    }];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockFotosPorMissao.mockResolvedValue(missaoMock);
    mockFotosPorHora.mockResolvedValue([]);

    const input = createInput();
    const result = await getEventInsights(input, mockPool);

    expect(result.missoes[0]!.titulo).toBe("");
  });
});

describe("getGuestMetrics", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    expectedGuests: 100,
    ...overrides,
  });

  it("deve carregar métricas completas", async () => {
    const metricasMock = {
      sessoesComUpload: 45,
      totalFotos: 180,
      sharesTotais: 50,
      ultimas: [
        { id: "foto-1", criadaEm: new Date("2026-08-28T20:00:00Z"), chaveThumb: "thumb-1" },
        { id: "foto-2", criadaEm: new Date("2026-08-28T20:05:00Z"), chaveThumb: "thumb-2" },
      ],
    };
    const funilMock = {
      totalSessoes: 60,
      degraus: [{ nome: "qr", sessoes: 60 }],
      uploadsAntesDoFeed: 100,
      uploadsDepoisDoFeed: 80,
      entradasPorVia: [{ via: "qr", sessoes: 60 }],
    };
    const sessoesMock = [
      { id: "ses-1", nome: "João", fotos: 5 },
      { id: "ses-2", nome: "Maria", fotos: 8 },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockLerMetricasAoVivo.mockResolvedValue(metricasMock);
    mockLerFunilAgregado.mockResolvedValue(funilMock);
    mockListarSessoesDoHost.mockResolvedValue(sessoesMock);
    mockDecideThesis.mockReturnValue({ taxa: 0.45, codigo: "h1_confirmada" });
    mockAssinarGet
      .mockResolvedValueOnce("https://r2.example.com/thumb-1")
      .mockResolvedValueOnce("https://r2.example.com/thumb-2");

    const input = createInput();
    const result = await getGuestMetrics(input, mockPool);

    expect(result.expectedGuests).toBe(100);
    expect(result.totalSessoes).toBe(60);
    expect(result.sessoesComUpload).toBe(45);
    expect(result.totalFotos).toBe(180);
    expect(result.sharesTotais).toBe(50);
    expect(result.participacao).toBe(0.45);
    expect(result.veredito).toBe("h1_confirmada");
    expect(result.ultimas).toHaveLength(2);
    expect(result.ultimas[0]).toEqual({
      id: "foto-1",
      criadaEm: "2026-08-28T20:00:00.000Z",
      thumb: "https://r2.example.com/thumb-1",
    });
    expect(result.sessoes).toEqual(sessoesMock);

    expect(mockDecideThesis).toHaveBeenCalledWith({
      expectedGuests: 100,
      sessoesComUpload: 45,
    });
    expect(mockAssinarGet).toHaveBeenCalledWith("thumb-1", 900);
    expect(mockAssinarGet).toHaveBeenCalledWith("thumb-2", 900);
  });

  it("deve funcionar sem fotos recentes", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockLerMetricasAoVivo.mockResolvedValue({
      sessoesComUpload: 0,
      totalFotos: 0,
      sharesTotais: 0,
      ultimas: [],
    });
    mockLerFunilAgregado.mockResolvedValue({
      totalSessoes: 10,
      degraus: [],
      uploadsAntesDoFeed: 0,
      uploadsDepoisDoFeed: 0,
      entradasPorVia: [],
    });
    mockListarSessoesDoHost.mockResolvedValue([]);
    mockDecideThesis.mockReturnValue({ taxa: 0, codigo: "h1_refutada" });

    const input = createInput();
    const result = await getGuestMetrics(input, mockPool);

    expect(result.ultimas).toEqual([]);
    expect(result.sessoes).toEqual([]);
    expect(mockAssinarGet).not.toHaveBeenCalled();
  });

  it("deve calcular veredito com tese H1", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockLerMetricasAoVivo.mockResolvedValue({
      sessoesComUpload: 60,
      totalFotos: 200,
      sharesTotais: 0,
      ultimas: [],
    });
    mockLerFunilAgregado.mockResolvedValue({
      totalSessoes: 80,
      degraus: [],
      uploadsAntesDoFeed: 0,
      uploadsDepoisDoFeed: 0,
      entradasPorVia: [],
    });
    mockListarSessoesDoHost.mockResolvedValue([]);
    mockDecideThesis.mockReturnValue({ taxa: 0.60, codigo: "h1_confirmada" });

    const input = createInput({ expectedGuests: 100 });
    const result = await getGuestMetrics(input, mockPool);

    expect(result.participacao).toBe(0.60);
    expect(result.veredito).toBe("h1_confirmada");
    expect(mockDecideThesis).toHaveBeenCalledWith({
      expectedGuests: 100,
      sessoesComUpload: 60,
    });
  });

  it("deve incluir degraus do funil", async () => {
    const degrausMock = [
      { nome: "qr", sessoes: 100 },
      { nome: "consentimento", sessoes: 95 },
      { nome: "camera", sessoes: 80 },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockLerMetricasAoVivo.mockResolvedValue({
      sessoesComUpload: 50,
      totalFotos: 150,
      sharesTotais: 0,
      ultimas: [],
    });
    mockLerFunilAgregado.mockResolvedValue({
      totalSessoes: 100,
      degraus: degrausMock,
      uploadsAntesDoFeed: 0,
      uploadsDepoisDoFeed: 0,
      entradasPorVia: [],
    });
    mockListarSessoesDoHost.mockResolvedValue([]);
    mockDecideThesis.mockReturnValue({ taxa: 0.50, codigo: "h1_confirmada" });

    const input = createInput();
    const result = await getGuestMetrics(input, mockPool);

    expect(result.degraus).toEqual(degrausMock);
  });

  it("deve incluir uploads antes e depois do feed", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockLerMetricasAoVivo.mockResolvedValue({
      sessoesComUpload: 40,
      totalFotos: 120,
      sharesTotais: 0,
      ultimas: [],
    });
    mockLerFunilAgregado.mockResolvedValue({
      totalSessoes: 50,
      degraus: [],
      uploadsAntesDoFeed: 70,
      uploadsDepoisDoFeed: 50,
      entradasPorVia: [],
    });
    mockListarSessoesDoHost.mockResolvedValue([]);
    mockDecideThesis.mockReturnValue({ taxa: 0.40, codigo: "h1_confirmada" });

    const input = createInput();
    const result = await getGuestMetrics(input, mockPool);

    expect(result.uploadsAntesDoFeed).toBe(70);
    expect(result.uploadsDepoisDoFeed).toBe(50);
  });

  it("deve incluir entradas por via", async () => {
    const entradasMock = [
      { via: "qr", sessoes: 60 },
      { via: "link", sessoes: 20 },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockLerMetricasAoVivo.mockResolvedValue({
      sessoesComUpload: 50,
      totalFotos: 150,
      sharesTotais: 0,
      ultimas: [],
    });
    mockLerFunilAgregado.mockResolvedValue({
      totalSessoes: 80,
      degraus: [],
      uploadsAntesDoFeed: 0,
      uploadsDepoisDoFeed: 0,
      entradasPorVia: entradasMock,
    });
    mockListarSessoesDoHost.mockResolvedValue([]);
    mockDecideThesis.mockReturnValue({ taxa: 0.50, codigo: "h1_confirmada" });

    const input = createInput();
    const result = await getGuestMetrics(input, mockPool);

    expect(result.entradasPorVia).toEqual(entradasMock);
  });
});
