/**
 * Testes: Admin Print Pieces Use Case
 * 
 * Cobertura:
 * - generatePrintPieces: gera peças impressas (SVG, PDF, ZIP)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { generatePrintPieces } from "./generate-print-pieces";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithAccount,
  mockWithEvent,
  mockListChallenges,
  mockRecordProductEvent,
  mockResolveTokens,
  mockIdentityToFrame,
  mockEventEntryUrl,
  mockMissionTitlesForPrint,
  mockGeneratePiecePdf,
  mockGeneratePieceSvg,
  mockPackPrintPieces,
  PACKS,
  ALBORA_BRAND,
} = vi.hoisted(() => ({
  mockWithAccount: vi.fn(),
  mockWithEvent: vi.fn(),
  mockListChallenges: vi.fn(),
  mockRecordProductEvent: vi.fn(),
  mockResolveTokens: vi.fn(),
  mockIdentityToFrame: vi.fn(),
  mockEventEntryUrl: vi.fn(),
  mockMissionTitlesForPrint: vi.fn(),
  mockGeneratePiecePdf: vi.fn(),
  mockGeneratePieceSvg: vi.fn(),
  mockPackPrintPieces: vi.fn(),
  PACKS: {
    casamento: { tokens: {} },
  },
  ALBORA_BRAND: {},
}));

vi.mock("@albora/db", () => ({
  withAccount: mockWithAccount,
  withEvent: mockWithEvent,
  listChallenges: mockListChallenges,
  recordProductEvent: mockRecordProductEvent,
}));

vi.mock("@albora/packs", () => ({
  PACKS,
}));

vi.mock("@albora/tokens", () => ({
  ALBORA_BRAND,
  resolveTokens: mockResolveTokens,
}));

vi.mock("@/lib/generate-piece-pdf", () => ({
  generatePiecePdf: mockGeneratePiecePdf,
}));

vi.mock("@/lib/generate-piece-svg", () => ({
  generatePieceSvg: mockGeneratePieceSvg,
}));

vi.mock("@/lib/pack-print-pieces", () => ({
  packPrintPieces: mockPackPrintPieces,
}));

vi.mock("@/lib/piece-missions", () => ({
  missionTitlesForPrint: mockMissionTitlesForPrint,
}));

vi.mock("@/lib/frame-identity", () => ({
  identityToFrame: mockIdentityToFrame,
}));

vi.mock("@/lib/qr", () => ({
  eventEntryUrl: mockEventEntryUrl,
}));

describe("generatePrintPieces", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    
    // Setup padrão
    mockWithAccount.mockImplementation(async (_pool, _accountId, fn) => fn({
      query: vi.fn().mockResolvedValue({
        rows: [{
          slug: "maria-joao",
          pack_id: "casamento",
          starts_at: new Date("2026-09-15T18:00:00Z"),
          identity_tokens: {},
        }],
      }),
    }));
    
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockListChallenges.mockResolvedValue([]);
    mockResolveTokens.mockReturnValue({ cores: {} });
    mockIdentityToFrame.mockReturnValue({
      monograma: "M&J",
      titulo: "Maria & João",
      data: "15 de Setembro",
    });
    mockEventEntryUrl.mockReturnValue("https://albora.app/e/maria-joao?via=qr");
    mockMissionTitlesForPrint.mockReturnValue([]);
  });

  const createInput = (overrides = {}) => ({
    accountId: "acc-123",
    eventId: "evt-456",
    pedido: { kind: "zip" as const, includeSvg: false },
    origin: "https://albora.app",
    host: "https://albora.app",
    ...overrides,
  });

  it("deve rejeitar quando evento não encontrado", async () => {
    mockWithAccount.mockImplementation(async (_pool, _accountId, fn) => fn({
      query: vi.fn().mockResolvedValue({ rows: [] }),
    }));

    const input = createInput();
    const result = await generatePrintPieces(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("evento.nao_encontrado");
    }
  });

  it("deve gerar ZIP com sucesso", async () => {
    mockPackPrintPieces.mockResolvedValue({
      zip: new Uint8Array([1, 2, 3]),
      arquivos: 5,
      problemas: [],
      avisos: [],
    });

    const input = createInput({
      pedido: { kind: "zip", includeSvg: false },
    });
    const result = await generatePrintPieces(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok && result.kind === "zip") {
      expect(result.zip).toEqual(new Uint8Array([1, 2, 3]));
      expect(result.filename).toBe("albora-maria-joao-pecas.zip");
      expect(result.contentType).toBe("application/zip");
    }

    expect(mockRecordProductEvent).toHaveBeenCalledWith(mockPool, "qr_downloaded");
  });

  it("deve gerar ZIP com SVG incluído", async () => {
    mockPackPrintPieces.mockResolvedValue({
      zip: new Uint8Array([4, 5, 6]),
      arquivos: 8,
      problemas: [],
      avisos: ["Aviso teste"],
    });

    const input = createInput({
      pedido: { kind: "zip", includeSvg: true },
    });
    const result = await generatePrintPieces(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.avisos).toEqual(["Aviso teste"]);
    }

    expect(mockPackPrintPieces).toHaveBeenCalledWith(
      expect.any(Object),
      { slug: "maria-joao", includeSvg: true },
    );
  });

  it("deve rejeitar ZIP com problemas de validação", async () => {
    mockPackPrintPieces.mockResolvedValue({
      zip: new Uint8Array([]),
      arquivos: 0,
      problemas: ["Problema 1", "Problema 2"],
      avisos: ["Aviso 1"],
    });

    const input = createInput({
      pedido: { kind: "zip", includeSvg: false },
    });
    const result = await generatePrintPieces(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("peca.invalida");
      expect(result.details?.problemas).toEqual(["Problema 1", "Problema 2"]);
      expect(result.details?.avisos).toEqual(["Aviso 1"]);
    }

    expect(mockRecordProductEvent).not.toHaveBeenCalled();
  });

  it("deve gerar PDF single com sucesso", async () => {
    mockGeneratePiecePdf.mockResolvedValue({
      pdf: new Uint8Array([7, 8, 9]),
      problemas: [],
      avisos: [],
    });

    const input = createInput({
      pedido: { kind: "single", tipo: "pdf", formato: "placa-a4" },
    });
    const result = await generatePrintPieces(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok && result.kind === "pdf") {
      expect(result.pdf).toEqual(new Uint8Array([7, 8, 9]));
      expect(result.filename).toBe("albora-maria-joao-placa-a4.pdf");
      expect(result.contentType).toBe("application/pdf");
    }
  });

  it("deve rejeitar PDF com problemas", async () => {
    mockGeneratePiecePdf.mockResolvedValue({
      pdf: new Uint8Array([]),
      problemas: ["PDF inválido"],
      avisos: [],
    });

    const input = createInput({
      pedido: { kind: "single", tipo: "pdf", formato: "a5" },
    });
    const result = await generatePrintPieces(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("peca.invalida");
    }
  });

  it("deve gerar SVG single com sucesso", async () => {
    mockGeneratePieceSvg.mockResolvedValue({
      svg: "<svg>...</svg>",
      problemas: [],
      avisos: ["Aviso SVG"],
    });

    const input = createInput({
      pedido: { kind: "single", tipo: "svg", formato: "placa-a4" },
    });
    const result = await generatePrintPieces(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok && result.kind === "svg") {
      expect(result.svg).toBe("<svg>...</svg>");
      expect(result.filename).toBe("albora-maria-joao-placa-a4.svg");
      expect(result.contentType).toBe("image/svg+xml; charset=utf-8");
      expect(result.avisos).toEqual(["Aviso SVG"]);
    }
  });

  it("deve rejeitar SVG com problemas", async () => {
    mockGeneratePieceSvg.mockResolvedValue({
      svg: "",
      problemas: ["SVG inválido"],
      avisos: [],
    });

    const input = createInput({
      pedido: { kind: "single", tipo: "svg", formato: "a5" },
    });
    const result = await generatePrintPieces(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("peca.invalida");
    }
  });

  it("deve incluir missões do pack e custom", async () => {
    mockListChallenges.mockResolvedValue([
      { chaveTitulo: "missao-1" },
      { chaveTitulo: "missao-2" },
      { chaveTitulo: null },
    ]);
    mockMissionTitlesForPrint.mockReturnValue(["Missão 1", "Missão 2"]);
    mockPackPrintPieces.mockResolvedValue({
      zip: new Uint8Array([]),
      arquivos: 1,
      problemas: [],
      avisos: [],
    });

    const input = createInput();
    await generatePrintPieces(input, mockPool);

    expect(mockMissionTitlesForPrint).toHaveBeenCalledWith(
      PACKS.casamento,
      ["missao-1", "missao-2"],
    );
  });

  it("deve usar tokens do pack quando disponível", async () => {
    mockResolveTokens.mockReturnValue({ cores: { primary: "var(--color-primary)" } });

    const input = createInput({
      pedido: { kind: "single", tipo: "svg", formato: "placa-a4" },
    });
    mockGeneratePieceSvg.mockResolvedValue({
      svg: "<svg></svg>",
      problemas: [],
      avisos: [],
    });

    await generatePrintPieces(input, mockPool);

    expect(mockResolveTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        marca: ALBORA_BRAND,
        pack: {},
        evento: {},
      }),
    );
  });
});
