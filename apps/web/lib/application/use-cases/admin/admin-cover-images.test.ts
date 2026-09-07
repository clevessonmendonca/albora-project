/**
 * Testes: Admin Cover Images Use Cases
 * 
 * Cobertura:
 * - presignCoverImageUpload: gera presigned URL para cover
 * - confirmCoverImageUpload: confirma e valida cover
 * - removeCoverImage: remove cover do evento
 * - getCoverImageUrl: busca URL assinada da cover
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { presignCoverImageUpload } from "./presign-cover-image";
import { confirmCoverImageUpload } from "./confirm-cover-image";
import { removeCoverImage } from "./remove-cover-image";
import { getCoverImageUrl } from "./get-cover-image-url";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockNormalizeCoverImageMime,
  mockValidateCoverImageDeclaration,
  mockValidateCoverImageContent,
  mockIsCoverImageKey,
  mockDeriveCoverImageKey,
  mockSignPut,
  mockSignGet,
  mockInspectObject,
  mockWithEvent,
  mockAtualizarChaveImagemCapa,
  VALIDADE_PRESIGN_SEGUNDOS,
} = vi.hoisted(() => ({
  mockNormalizeCoverImageMime: vi.fn(),
  mockValidateCoverImageDeclaration: vi.fn(),
  mockValidateCoverImageContent: vi.fn(),
  mockIsCoverImageKey: vi.fn(),
  mockDeriveCoverImageKey: vi.fn(),
  mockSignPut: vi.fn(),
  mockSignGet: vi.fn(),
  mockInspectObject: vi.fn(),
  mockWithEvent: vi.fn(),
  mockAtualizarChaveImagemCapa: vi.fn(),
  VALIDADE_PRESIGN_SEGUNDOS: 900,
}));

vi.mock("@albora/core", () => ({
  normalizeCoverImageMime: mockNormalizeCoverImageMime,
  validateCoverImageDeclaration: mockValidateCoverImageDeclaration,
  validateCoverImageContent: mockValidateCoverImageContent,
  isCoverImageKey: mockIsCoverImageKey,
  deriveCoverImageKey: mockDeriveCoverImageKey,
  VALIDADE_PRESIGN_SEGUNDOS,
}));

vi.mock("@/lib/r2", () => ({
  signPut: mockSignPut,
  signGet: mockSignGet,
  inspectObject: mockInspectObject,
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  atualizarChaveImagemCapa: mockAtualizarChaveImagemCapa,
}));

describe("presignCoverImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    mime: "image/jpeg",
    bytes: 500000,
    ...overrides,
  });

  it("deve gerar presigned URL para JPEG", async () => {
    mockNormalizeCoverImageMime.mockReturnValue("image/jpeg");
    mockValidateCoverImageDeclaration.mockReturnValue(null);
    mockDeriveCoverImageKey.mockReturnValue("events/evt-123/cover.jpg");
    mockSignPut.mockResolvedValue("https://r2.example.com/presigned-put");

    const input = createInput();
    const result = await presignCoverImageUpload(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chave).toBe("events/evt-123/cover.jpg");
      expect(result.put).toBe("https://r2.example.com/presigned-put");
      expect(result.expiraEm).toBeGreaterThan(Date.now());
    }

    expect(mockSignPut).toHaveBeenCalledWith(
      "events/evt-123/cover.jpg",
      "image/jpeg",
      VALIDADE_PRESIGN_SEGUNDOS,
    );
  });

  it("deve rejeitar MIME não suportado", async () => {
    mockNormalizeCoverImageMime.mockReturnValue(null);

    const input = createInput({ mime: "image/gif" });
    const result = await presignCoverImageUpload(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("imagem.tipo_recusado");
      expect(result.details?.aceitos).toBeDefined();
    }
  });

  it("deve rejeitar imagem vazia", async () => {
    mockNormalizeCoverImageMime.mockReturnValue("image/jpeg");
    mockValidateCoverImageDeclaration.mockReturnValue("imagem.vazia");

    const input = createInput({ bytes: 0 });
    const result = await presignCoverImageUpload(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("imagem.vazia");
    }
  });

  it("deve rejeitar imagem grande demais", async () => {
    mockNormalizeCoverImageMime.mockReturnValue("image/jpeg");
    mockValidateCoverImageDeclaration.mockReturnValue("imagem.grande_demais");

    const input = createInput({ bytes: 15 * 1024 * 1024 });
    const result = await presignCoverImageUpload(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("imagem.grande_demais");
      expect(result.details?.limite_bytes).toBe(10 * 1024 * 1024);
    }
  });
});

describe("confirmCoverImageUpload", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    chave: "events/evt-123/cover.jpg",
    mime: "image/jpeg",
    ...overrides,
  });

  it("deve confirmar upload com sucesso", async () => {
    mockIsCoverImageKey.mockReturnValue(true);
    mockNormalizeCoverImageMime.mockReturnValue("image/jpeg");
    mockInspectObject.mockResolvedValue({
      bytes: 500000,
      inicio: Buffer.from([0xff, 0xd8, 0xff]),
    });
    mockValidateCoverImageDeclaration.mockReturnValue(null);
    mockValidateCoverImageContent.mockReturnValue(true);
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockAtualizarChaveImagemCapa.mockResolvedValue(undefined);
    mockSignGet.mockResolvedValue("https://r2.example.com/presigned-get");

    const input = createInput();
    const result = await confirmCoverImageUpload(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chave).toBe("events/evt-123/cover.jpg");
      expect(result.url).toBe("https://r2.example.com/presigned-get");
    }

    expect(mockAtualizarChaveImagemCapa).toHaveBeenCalledWith(
      null,
      "evt-123",
      "events/evt-123/cover.jpg",
    );
  });

  it("deve rejeitar chave inválida", async () => {
    mockIsCoverImageKey.mockReturnValue(false);

    const input = createInput({ chave: "invalid/path.jpg" });
    const result = await confirmCoverImageUpload(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("imagem.chave_invalida");
    }
  });

  it("deve rejeitar quando objeto ausente", async () => {
    mockIsCoverImageKey.mockReturnValue(true);
    mockNormalizeCoverImageMime.mockReturnValue("image/jpeg");
    mockInspectObject.mockResolvedValue(null);

    const input = createInput();
    const result = await confirmCoverImageUpload(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("imagem.ausente");
    }
  });

  it("deve rejeitar conteúdo inválido", async () => {
    mockIsCoverImageKey.mockReturnValue(true);
    mockNormalizeCoverImageMime.mockReturnValue("image/jpeg");
    mockInspectObject.mockResolvedValue({
      bytes: 500000,
      inicio: Buffer.from([0x00, 0x00, 0x00]),
    });
    mockValidateCoverImageDeclaration.mockReturnValue(null);
    mockValidateCoverImageContent.mockReturnValue(false);

    const input = createInput();
    const result = await confirmCoverImageUpload(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("imagem.conteudo_recusado");
    }
  });
});

describe("removeCoverImage", () => {
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

  it("deve remover imagem de capa", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockAtualizarChaveImagemCapa.mockResolvedValue(undefined);

    const input = createInput();
    await removeCoverImage(input, mockPool);

    expect(mockAtualizarChaveImagemCapa).toHaveBeenCalledWith(null, "evt-123", null);
  });
});

describe("getCoverImageUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    coverImageKey: "events/evt-123/cover.jpg",
    ...overrides,
  });

  it("deve retornar URL assinada quando há cover", async () => {
    mockSignGet.mockResolvedValue("https://r2.example.com/signed-url");

    const input = createInput();
    const result = await getCoverImageUrl(input);

    expect(result.url).toBe("https://r2.example.com/signed-url");
    expect(result.chave).toBe("events/evt-123/cover.jpg");
  });

  it("deve retornar null quando não há cover", async () => {
    const input = createInput({ coverImageKey: null });
    const result = await getCoverImageUrl(input);

    expect(result.url).toBeNull();
    expect(result.chave).toBeNull();
  });
});
