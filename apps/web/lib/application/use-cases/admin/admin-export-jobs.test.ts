/**
 * Testes: Admin Export Jobs Use Cases
 * 
 * Cobertura:
 * - createExportJob: cria job de export (full ou curated)
 * - getLatestExportJob: busca último job de export
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createExportJob } from "./create-export-job";
import { getLatestExportJob } from "./get-latest-export-job";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockConsumirStepUp,
  mockCriarJobExport,
  mockJobExportMaisRecente,
  mockMidiaParaCuradoria,
  mockSendHostEmail,
  mockResolver,
  mockSelecionarParaAlbum,
  mockPlanejarCapitulos,
  ErroMagicLinkInvalido,
  PACKS,
  TETO_DE_PAGINAS_PADRAO,
} = vi.hoisted(() => {
  class ErroMagicLinkInvalidoMock extends Error {
    motivo: string;
    constructor(motivo: string) {
      super(motivo);
      this.name = "ErroMagicLinkInvalido";
      this.motivo = motivo;
    }
  }

  return {
    mockConsumirStepUp: vi.fn(),
    mockCriarJobExport: vi.fn(),
    mockJobExportMaisRecente: vi.fn(),
    mockMidiaParaCuradoria: vi.fn(),
    mockSendHostEmail: vi.fn(),
    mockResolver: vi.fn(),
    mockSelecionarParaAlbum: vi.fn(),
    mockPlanejarCapitulos: vi.fn(),
    ErroMagicLinkInvalido: ErroMagicLinkInvalidoMock,
    PACKS: {},
    TETO_DE_PAGINAS_PADRAO: 200,
  };
});

vi.mock("@albora/db", () => ({
  consumirStepUp: mockConsumirStepUp,
  criarJobExport: mockCriarJobExport,
  jobExportMaisRecente: mockJobExportMaisRecente,
  midiaParaCuradoria: mockMidiaParaCuradoria,
  ErroMagicLinkInvalido,
}));

vi.mock("@albora/core", () => ({
  resolver: mockResolver,
  selecionarParaAlbum: mockSelecionarParaAlbum,
  planejarCapitulos: mockPlanejarCapitulos,
  TETO_DE_PAGINAS_PADRAO,
}));

vi.mock("@albora/packs", () => ({
  PACKS,
}));

vi.mock("@/lib/email", () => ({
  sendHostEmail: mockSendHostEmail,
}));

describe("createExportJob", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    hostEmail: "host@example.com",
    sessionSecret: "secret",
    token: "step-up-token",
    curated: false,
    requestOrigin: "https://albora.app",
    ...overrides,
  });

  it("deve criar job full com sucesso", async () => {
    mockConsumirStepUp.mockResolvedValue(undefined);
    mockCriarJobExport.mockResolvedValue({
      id: "job-1",
      estado: "processando",
      modo: "full",
      fotos: 100,
      criadoEm: new Date("2026-08-28T10:00:00Z"),
    });

    const input = createInput();
    const result = await createExportJob(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.id).toBe("job-1");
      expect(result.job.estado).toBe("processando");
      expect(result.job.modo).toBe("full");
      expect(result.job.fotos).toBe(100);
      expect(result.job.baixar).toBeNull();
    }

    expect(mockCriarJobExport).toHaveBeenCalledWith(
      mockPool,
      "acc-456",
      "evt-123",
      undefined,
    );
  });

  it("deve criar job pronto e enviar e-mail", async () => {
    mockConsumirStepUp.mockResolvedValue(undefined);
    mockCriarJobExport.mockResolvedValue({
      id: "job-2",
      estado: "pronto",
      modo: "full",
      fotos: 50,
      criadoEm: new Date("2026-08-28T10:00:00Z"),
    });

    const input = createInput();
    const result = await createExportJob(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.estado).toBe("pronto");
      expect(result.job.baixar).toBe("/api/admin/events/evt-123/export/arquivo?job=job-2");
    }

    expect(mockSendHostEmail).toHaveBeenCalledWith({
      to: "host@example.com",
      subject: "As fotos da festa estão prontas",
      text: expect.stringContaining("50 arquivos"),
    });
  });

  it("deve rejeitar step-up inválido", async () => {
    mockConsumirStepUp.mockRejectedValue(new ErroMagicLinkInvalido("expirado"));

    const input = createInput();
    const result = await createExportJob(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("admin.reauth_invalida");
    }
  });

  it("deve criar job curated sem seleção", async () => {
    mockConsumirStepUp.mockResolvedValue(undefined);
    mockMidiaParaCuradoria.mockResolvedValue({
      janela: null,
      midias: [],
      packId: null,
    });
    mockCriarJobExport.mockResolvedValue({
      id: "job-3",
      estado: "processando",
      modo: "curated",
      fotos: 30,
      criadoEm: new Date("2026-08-28T10:00:00Z"),
    });

    const input = createInput({ curated: true });
    const result = await createExportJob(input, mockPool);

    expect(result.ok).toBe(true);
    expect(mockCriarJobExport).toHaveBeenCalledWith(
      mockPool,
      "acc-456",
      "evt-123",
      { curated: true },
    );
  });

  it("deve criar job curated com seleção de mídia", async () => {
    mockConsumirStepUp.mockResolvedValue(undefined);
    mockMidiaParaCuradoria.mockResolvedValue({
      janela: {
        comecaEm: new Date("2026-08-28T18:00:00Z"),
        terminaEm: new Date("2026-08-28T23:00:00Z"),
        offsetMinutos: -180,
      },
      midias: [
        { id: "m1", uploadedAt: new Date() },
        { id: "m2", uploadedAt: new Date() },
      ],
      packId: "casamento",
    });
    mockPlanejarCapitulos.mockReturnValue([]);
    mockResolver.mockReturnValue([
      { id: "m1", score: 0.9 },
      { id: "m2", score: 0.8 },
    ]);
    mockSelecionarParaAlbum.mockReturnValue({
      mantidas: [
        { id: "m1", score: 0.9 },
        { id: "m2", score: 0.8 },
      ],
      descartadas: [],
    });
    mockCriarJobExport.mockResolvedValue({
      id: "job-4",
      estado: "processando",
      modo: "curated",
      fotos: 2,
      criadoEm: new Date("2026-08-28T10:00:00Z"),
    });

    const input = createInput({ curated: true });
    const result = await createExportJob(input, mockPool);

    expect(result.ok).toBe(true);
    expect(mockCriarJobExport).toHaveBeenCalledWith(
      mockPool,
      "acc-456",
      "evt-123",
      { curated: true, curatedIds: ["m1", "m2"] },
    );
  });

  it("deve retornar erro quando evento não encontrado", async () => {
    mockConsumirStepUp.mockResolvedValue(undefined);
    mockCriarJobExport.mockResolvedValue(null);

    const input = createInput();
    const result = await createExportJob(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("evento.nao_encontrado");
    }
  });
});

describe("getLatestExportJob", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    ...overrides,
  });

  it("deve retornar job mais recente", async () => {
    mockJobExportMaisRecente.mockResolvedValue({
      id: "job-1",
      estado: "pronto",
      modo: "full",
      fotos: 100,
      criadoEm: new Date("2026-08-28T10:00:00Z"),
    });

    const input = createInput();
    const result = await getLatestExportJob(input, mockPool);

    expect(result.job).not.toBeNull();
    expect(result.job?.id).toBe("job-1");
    expect(result.job?.estado).toBe("pronto");
    expect(result.job?.fotos).toBe(100);
    expect(result.job?.baixar).toBe("/api/admin/events/evt-123/export/arquivo?job=job-1");
  });

  it("deve retornar null quando não há job", async () => {
    mockJobExportMaisRecente.mockResolvedValue(null);

    const input = createInput();
    const result = await getLatestExportJob(input, mockPool);

    expect(result.job).toBeNull();
  });

  it("deve retornar job sem link de download quando processando", async () => {
    mockJobExportMaisRecente.mockResolvedValue({
      id: "job-2",
      estado: "processando",
      modo: "full",
      fotos: 50,
      criadoEm: new Date("2026-08-28T10:00:00Z"),
    });

    const input = createInput();
    const result = await getLatestExportJob(input, mockPool);

    expect(result.job?.baixar).toBeNull();
  });

  it("deve filtrar por modo curated", async () => {
    mockJobExportMaisRecente.mockResolvedValue({
      id: "job-3",
      estado: "pronto",
      modo: "curated",
      fotos: 30,
      criadoEm: new Date("2026-08-28T10:00:00Z"),
    });

    const input = createInput({ modo: "curated" });
    const result = await getLatestExportJob(input, mockPool);

    expect(result.job?.modo).toBe("curated");
    expect(mockJobExportMaisRecente).toHaveBeenCalledWith(
      mockPool,
      "acc-456",
      "evt-123",
      "curated",
    );
  });
});
