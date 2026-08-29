/**
 * Testes: Generate Book PDF Use Case
 * 
 * Cobertura:
 * - Validação de plano e janela
 * - Geração bem-sucedida de PDF
 * - Casos com/sem pack
 * - Tokens (vendor, pack, evento)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateBookPdfUseCase } from "./generate-book-pdf";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockPlanoDoEvento,
  mockPodeBaixarZip,
  mockMontarAlbum,
  mockGenerateBookPdf,
  mockListarMidiaDoAlbum,
  mockJanelaDoAlbum,
  mockEventPack,
  mockChapterTitle,
  mockPlanAlbumChapters,
  PACKS,
  TETO_DE_PAGINAS_PADRAO,
} = vi.hoisted(() => ({
  mockWithEvent: vi.fn(),
  mockPlanoDoEvento: vi.fn(),
  mockPodeBaixarZip: vi.fn(),
  mockMontarAlbum: vi.fn(),
  mockGenerateBookPdf: vi.fn(),
  mockListarMidiaDoAlbum: vi.fn(),
  mockJanelaDoAlbum: vi.fn(),
  mockEventPack: vi.fn(),
  mockChapterTitle: vi.fn(),
  mockPlanAlbumChapters: vi.fn(),
  PACKS: {
    casamento: {
      tokens: {
        "color.primary": "var(--color-primary)",
        "font.family.heading": "Playfair Display",
      },
    },
  },
  TETO_DE_PAGINAS_PADRAO: 200,
}));

vi.mock("@albora/core", () => ({
  montarAlbum: mockMontarAlbum,
  podeBaixarZip: mockPodeBaixarZip,
  TETO_DE_PAGINAS_PADRAO,
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  planoDoEvento: mockPlanoDoEvento,
  listarMidiaDoAlbum: mockListarMidiaDoAlbum,
  janelaDoAlbum: mockJanelaDoAlbum,
  eventPack: mockEventPack,
}));

vi.mock("@albora/packs", () => ({
  PACKS,
}));

vi.mock("@/lib/generate-book-pdf", () => ({
  generateBookPdf: mockGenerateBookPdf,
}));

vi.mock("@/lib/album-chapters", () => ({
  chapterTitle: mockChapterTitle,
  planAlbumChapters: mockPlanAlbumChapters,
}));

vi.mock("@/lib/r2", () => ({
  readThumb: vi.fn().mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff])),
  bufferObject: vi.fn().mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff])),
}));

describe("generateBookPdfUseCase - Validação", () => {
  let mockPool: Pool;
  let mockClient: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- mock de query sem PoolClient

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    eventSlug: "meu-evento",
    ...overrides,
  });

  it("deve rejeitar quando plano não permite download", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ vendor_id: null, identity_tokens: {} }],
        });
      
      return fn(mockClient);
    });
    
    mockPlanoDoEvento.mockResolvedValue("gratis");
    mockPodeBaixarZip.mockReturnValue(false);
    mockListarMidiaDoAlbum.mockResolvedValue([]);
    mockJanelaDoAlbum.mockResolvedValue(null);
    mockEventPack.mockResolvedValue(null);

    const input = createInput();
    const result = await generateBookPdfUseCase(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plano.insuficiente");
      expect(result.message).toBe("O livro PDF entra nos planos pagos");
    }
  });

  it("deve rejeitar quando evento não tem janela", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ vendor_id: null, identity_tokens: {} }],
        });
      
      return fn(mockClient);
    });

    mockPlanoDoEvento.mockResolvedValue("pro");
    mockPodeBaixarZip.mockReturnValue(true);
    mockListarMidiaDoAlbum.mockResolvedValue([]);
    mockJanelaDoAlbum.mockResolvedValue(null);
    mockEventPack.mockResolvedValue(null);

    const input = createInput();
    const result = await generateBookPdfUseCase(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("evento.sem_janela");
      expect(result.message).toBe("Evento sem datas para montar o livro");
    }
  });

  it("deve validar plano enterprise", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ vendor_id: null, identity_tokens: {} }],
        });
      
      return fn(mockClient);
    });

    mockPlanoDoEvento.mockResolvedValue("enterprise");
    mockPodeBaixarZip.mockReturnValue(true);
    mockListarMidiaDoAlbum.mockResolvedValue([]);
    mockJanelaDoAlbum.mockResolvedValue({
      comecaEm: new Date("2026-08-28T18:00:00Z"),
      terminaEm: new Date("2026-08-28T23:00:00Z"),
      offsetMinutos: -180,
    });
    mockEventPack.mockResolvedValue(null);
    mockPlanAlbumChapters.mockReturnValue([]);
    mockMontarAlbum.mockReturnValue({
      capitulos: [],
    });
    mockGenerateBookPdf.mockResolvedValue({
      pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      paginas: 10,
      comFotos: 5,
    });

    const input = createInput();
    const result = await generateBookPdfUseCase(input, mockPool);

    expect(result.ok).toBe(true);
  });
});

describe("generateBookPdfUseCase - Geração bem-sucedida", () => {
  let mockPool: Pool;
  let mockClient: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- mock de query sem PoolClient

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    
    mockClient = {
      query: vi.fn(),
    };

    mockPlanoDoEvento.mockResolvedValue("pro");
    mockPodeBaixarZip.mockReturnValue(true);
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    eventSlug: "meu-evento",
    ...overrides,
  });

  it("deve gerar PDF com sucesso", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ vendor_id: null, identity_tokens: {} }],
        });
      
      return fn(mockClient);
    });

    mockListarMidiaDoAlbum.mockResolvedValue([
      {
        id: "media-1",
        chaveThumb: "events/evt-123/media-1-thumb.jpg",
        chaveFull: "events/evt-123/media-1-full.jpg",
      },
    ]);
    mockJanelaDoAlbum.mockResolvedValue({
      comecaEm: new Date("2026-08-28T18:00:00Z"),
      terminaEm: new Date("2026-08-28T23:00:00Z"),
      offsetMinutos: -180,
    });
    mockEventPack.mockResolvedValue(null);
    mockPlanAlbumChapters.mockReturnValue([
      { id: "cap-1", titulo: "Cerimônia" },
    ]);
    mockMontarAlbum.mockReturnValue({
      capitulos: [
        {
          id: "cap-1",
          paginas: [
            {
              fotos: [
                { midia: { id: "media-1" } },
              ],
            },
          ],
        },
      ],
    });
    mockChapterTitle.mockReturnValue("Cerimônia");
    mockGenerateBookPdf.mockResolvedValue({
      pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      paginas: 10,
      comFotos: 5,
    });

    const input = createInput();
    const result = await generateBookPdfUseCase(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pdf).toBeInstanceOf(Uint8Array);
      expect(result.paginas).toBe(10);
      expect(result.comFotos).toBe(5);
      expect(result.slug).toBe("meu-evento");
    }

    expect(mockGenerateBookPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        album: expect.any(Object),
        tituloDoCapitulo: expect.any(Function),
        imagens: expect.any(Map),
      })
    );
  });

  it("deve usar slug padrão quando eventSlug é null", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ vendor_id: null, identity_tokens: {} }],
        });
      
      return fn(mockClient);
    });

    mockListarMidiaDoAlbum.mockResolvedValue([]);
    mockJanelaDoAlbum.mockResolvedValue({
      comecaEm: new Date("2026-08-28T18:00:00Z"),
      terminaEm: new Date("2026-08-28T23:00:00Z"),
      offsetMinutos: -180,
    });
    mockEventPack.mockResolvedValue(null);
    mockPlanAlbumChapters.mockReturnValue([]);
    mockMontarAlbum.mockReturnValue({
      capitulos: [],
    });
    mockGenerateBookPdf.mockResolvedValue({
      pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      paginas: 1,
      comFotos: 0,
    });

    const input = createInput({ eventSlug: null });
    const result = await generateBookPdfUseCase(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slug).toBe("livro");
    }
  });
});

describe("generateBookPdfUseCase - Pack", () => {
  let mockPool: Pool;
  let mockClient: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- mock de query sem PoolClient

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    
    mockClient = {
      query: vi.fn(),
    };

    mockPlanoDoEvento.mockResolvedValue("pro");
    mockPodeBaixarZip.mockReturnValue(true);
    mockListarMidiaDoAlbum.mockResolvedValue([]);
    mockJanelaDoAlbum.mockResolvedValue({
      comecaEm: new Date("2026-08-28T18:00:00Z"),
      terminaEm: new Date("2026-08-28T23:00:00Z"),
      offsetMinutos: -180,
    });
    mockPlanAlbumChapters.mockReturnValue([]);
    mockMontarAlbum.mockReturnValue({
      capitulos: [],
    });
    mockGenerateBookPdf.mockResolvedValue({
      pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      paginas: 1,
      comFotos: 0,
    });
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    eventSlug: "meu-evento",
    ...overrides,
  });

  it("deve gerar PDF sem pack", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ vendor_id: null, identity_tokens: {} }],
        });
      
      return fn(mockClient);
    });

    mockEventPack.mockResolvedValue(null);

    const input = createInput();
    await generateBookPdfUseCase(input, mockPool);

    expect(mockGenerateBookPdf).toHaveBeenCalledWith(
      expect.not.objectContaining({
        packTokens: expect.anything(),
      })
    );
  });

  it("deve gerar PDF com pack e tokens", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ vendor_id: null, identity_tokens: {} }],
        });
      
      return fn(mockClient);
    });

    mockEventPack.mockResolvedValue("casamento");

    const input = createInput();
    await generateBookPdfUseCase(input, mockPool);

    expect(mockGenerateBookPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        packTokens: {
          "color.primary": "var(--color-primary)",
          "font.family.heading": "Playfair Display",
        },
      })
    );
  });
});

describe("generateBookPdfUseCase - Tokens", () => {
  let mockPool: Pool;
  let mockClient: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- mock de query sem PoolClient

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    
    mockClient = {
      query: vi.fn(),
    };

    mockPlanoDoEvento.mockResolvedValue("pro");
    mockPodeBaixarZip.mockReturnValue(true);
    mockListarMidiaDoAlbum.mockResolvedValue([]);
    mockJanelaDoAlbum.mockResolvedValue({
      comecaEm: new Date("2026-08-28T18:00:00Z"),
      terminaEm: new Date("2026-08-28T23:00:00Z"),
      offsetMinutos: -180,
    });
    mockEventPack.mockResolvedValue(null);
    mockPlanAlbumChapters.mockReturnValue([]);
    mockMontarAlbum.mockReturnValue({
      capitulos: [],
    });
    mockGenerateBookPdf.mockResolvedValue({
      pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      paginas: 1,
      comFotos: 0,
    });
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    eventSlug: "meu-evento",
    ...overrides,
  });

  it("deve incluir vendor tokens quando vendor_id presente", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            vendor_id: "vendor-1",
            identity_tokens: {},
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            brand_tokens: {
              "color.brand": "var(--color-brand)",
              "font.family.brand": "Montserrat",
            },
          }],
        });
      
      return fn(mockClient);
    });

    const input = createInput();
    await generateBookPdfUseCase(input, mockPool);

    expect(mockGenerateBookPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorTokens: {
          "color.brand": "var(--color-brand)",
          "font.family.brand": "Montserrat",
        },
      })
    );
  });

  it("deve incluir evento tokens quando presentes", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            vendor_id: null,
            identity_tokens: {
              "color.accent": "var(--color-accent)",
              "spacing.large": "2rem",
            },
          }],
        });
      
      return fn(mockClient);
    });

    const input = createInput();
    await generateBookPdfUseCase(input, mockPool);

    expect(mockGenerateBookPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        eventoTokens: {
          "color.accent": "var(--color-accent)",
          "spacing.large": "2rem",
        },
      })
    );
  });

  it("deve omitir vendor tokens quando brand_tokens vazio", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            vendor_id: "vendor-1",
            identity_tokens: {},
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            brand_tokens: {},
          }],
        });
      
      return fn(mockClient);
    });

    const input = createInput();
    await generateBookPdfUseCase(input, mockPool);

    expect(mockGenerateBookPdf).toHaveBeenCalledWith(
      expect.not.objectContaining({
        vendorTokens: expect.anything(),
      })
    );
  });

  it("deve omitir evento tokens quando identity_tokens vazio", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            vendor_id: null,
            identity_tokens: {},
          }],
        });
      
      return fn(mockClient);
    });

    const input = createInput();
    await generateBookPdfUseCase(input, mockPool);

    expect(mockGenerateBookPdf).toHaveBeenCalledWith(
      expect.not.objectContaining({
        eventoTokens: expect.anything(),
      })
    );
  });

  it("deve combinar vendor, pack e evento tokens", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            vendor_id: "vendor-1",
            identity_tokens: {
              "color.custom": "var(--color-custom)",
            },
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            brand_tokens: {
              "color.brand": "var(--color-brand)",
            },
          }],
        });
      
      return fn(mockClient);
    });

    mockEventPack.mockResolvedValue("casamento");

    const input = createInput();
    await generateBookPdfUseCase(input, mockPool);

    expect(mockGenerateBookPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorTokens: {
          "color.brand": "var(--color-brand)",
        },
        packTokens: {
          "color.primary": "var(--color-primary)",
          "font.family.heading": "Playfair Display",
        },
        eventoTokens: {
          "color.custom": "var(--color-custom)",
        },
      })
    );
  });
});
