/**
 * Testes do Use Case: Confirm Upload
 * 
 * Caminho crítico: pipeline de upload do convidado.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { confirmUpload, type ConfirmUploadInput } from "./confirm-upload";
import type { Pool, PoolClient } from "pg";

// Mocks das dependências usando vi.hoisted para evitar problemas de hoisting
const {
  mockPrefixoDoEvento,
  mockValidarObjetoRecebido,
  mockWithinPlanDimensions,
  mockWithEvent,
  mockConfirmUploadDB,
  mockCreateStory,
  mockChallengeBelongsToEvent,
  mockEventTimeZone,
  mockEventPack,
  mockPlanoDoEvento,
  mockIsValidConfessionPrompt,
  mockCleanCaption,
  mockAcceptedPlace,
  mockAcceptedTakenAt,
  mockAcceptedTakenAtInTimeZone,
  mockAcceptedSize,
} = vi.hoisted(() => ({
  mockPrefixoDoEvento: vi.fn((eventId: string) => `events/${eventId}`),
  mockValidarObjetoRecebido: vi.fn(),
  mockWithinPlanDimensions: vi.fn(),
  mockWithEvent: vi.fn(),
  mockConfirmUploadDB: vi.fn(),
  mockCreateStory: vi.fn(),
  mockChallengeBelongsToEvent: vi.fn(),
  mockEventTimeZone: vi.fn(),
  mockEventPack: vi.fn(),
  mockPlanoDoEvento: vi.fn(),
  mockIsValidConfessionPrompt: vi.fn(),
  mockCleanCaption: vi.fn((caption?: string) => caption?.trim() || null),
  mockAcceptedPlace: vi.fn((packId: string | null, place?: string) => place?.trim() || null),
  mockAcceptedTakenAt: vi.fn((timestamp?: string | number) => timestamp ? new Date(timestamp) : null),
  mockAcceptedTakenAtInTimeZone: vi.fn((timestamp: string | number | undefined, _tz: string) => timestamp ? new Date(timestamp) : null),
  mockAcceptedSize: vi.fn((width?: number, height?: number) => width && height ? { width, height } : null),
}));

// Configuração de mocks usando vi.mock
vi.mock("@albora/core", () => ({
  prefixoDoEvento: mockPrefixoDoEvento,
  validarObjetoRecebido: mockValidarObjetoRecebido,
  withinPlanDimensions: mockWithinPlanDimensions,
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  confirmUpload: mockConfirmUploadDB,
  createStory: mockCreateStory,
  challengeBelongsToEvent: mockChallengeBelongsToEvent,
  UploadConflictError: class UploadConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "UploadConflictError";
    }
  },
  eventTimeZone: mockEventTimeZone,
  eventPack: mockEventPack,
  planoDoEvento: mockPlanoDoEvento,
}));

vi.mock("@albora/packs", () => ({
  isValidConfessionPrompt: mockIsValidConfessionPrompt,
  PACKS: {
    wedding: { id: "wedding", nome: "Casamento" },
  },
}));

vi.mock("@/lib/details", () => ({
  cleanCaption: mockCleanCaption,
  acceptedPlace: mockAcceptedPlace,
  acceptedTakenAt: mockAcceptedTakenAt,
  acceptedTakenAtInTimeZone: mockAcceptedTakenAtInTimeZone,
  acceptedSize: mockAcceptedSize,
}));

// Helper para criar input válido
function createValidInput(overrides?: Partial<ConfirmUploadInput>): ConfirmUploadInput {
  return {
    eventoId: "evt-123",
    sessaoId: "sess-456",
    uploadId: "upl-789",
    chave: "events/evt-123/uploads/upl-789",
    mime: "image/jpeg",
    bytes: 1024000,
    inicio: new Uint8Array(16),
    thumbBytes: 50000,
    thumbInicio: new Uint8Array(16),
    legenda: "Foto da festa",
    lugar: "Salão principal",
    desafioId: "challenge-1",
    capturadaEm: Date.now(),
    largura: 1920,
    altura: 1080,
    story: false,
    ...overrides,
  };
}

// Helper para criar mock de PoolClient
function createMockClient(): PoolClient {
  return {
    query: vi.fn(),
    release: vi.fn(),
  } as unknown as PoolClient;
}

describe("confirmUpload", () => {
  let mockClient: PoolClient;
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    mockPool = {} as Pool;

    // Reset mocks para valores padrão
    mockPrefixoDoEvento.mockImplementation((eventId: string) => `events/${eventId}`);
    mockValidarObjetoRecebido.mockReturnValue(null);
    mockCleanCaption.mockImplementation((caption?: string) => caption?.trim() || null);
    mockAcceptedPlace.mockImplementation((_packId, place?: string) => place?.trim() || null);
    mockAcceptedTakenAt.mockImplementation((timestamp?: string | number) => timestamp ? new Date(timestamp) : null);
    mockAcceptedTakenAtInTimeZone.mockImplementation((timestamp: string | number | undefined) => timestamp ? new Date(timestamp) : null);
    mockAcceptedSize.mockImplementation((width?: number, height?: number) => width && height ? { width, height } : null);
  });

  describe("Validações de entrada", () => {
    it("deve rejeitar chave que não pertence ao evento", async () => {
      const input = createValidInput({
        eventoId: "evt-123",
        chave: "events/evt-999/uploads/upl-789",
      });

      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: false,
        code: "upload.chave_invalida",
        message: "Chave não pertence a este evento",
      });
      expect(mockWithEvent).not.toHaveBeenCalled();
    });

    it("deve rejeitar objeto com conteúdo inválido", async () => {
      mockValidarObjetoRecebido.mockReturnValueOnce({
        code: "upload.mime_invalido",
        details: { mime: "application/exe" },
      });

      const input = createValidInput();
      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: false,
        code: "upload.mime_invalido",
        message: "Arquivo recusado",
        details: { mime: "application/exe" },
      });
    });

    it("deve rejeitar thumb inválida", async () => {
      mockValidarObjetoRecebido
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          code: "upload.mime_invalido",
          details: { mime: "image/png" },
        });

      const input = createValidInput();
      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: false,
        code: "upload.mime_invalido",
        message: "Miniatura recusada",
        details: { mime: "image/png" },
      });
    });
  });

  describe("Validações de negócio", () => {
    beforeEach(() => {
      mockValidarObjetoRecebido.mockReturnValue(null);
      mockEventPack.mockResolvedValue("wedding");
      mockEventTimeZone.mockResolvedValue("America/Sao_Paulo");
      mockPlanoDoEvento.mockResolvedValue("premium");
      mockWithinPlanDimensions.mockReturnValue({ ok: true });
      mockConfirmUploadDB.mockResolvedValue({ estado: "criado" });
      mockWithEvent.mockImplementation(async (_client, _eventId, fn) => fn(mockClient));
    });

    it("deve validar que missão pertence ao evento", async () => {
      mockChallengeBelongsToEvent.mockResolvedValue(true);

      const input = createValidInput({ desafioId: "challenge-1" });
      const result = await confirmUpload(input, mockPool);

      expect(result.ok).toBe(true);
      expect(mockChallengeBelongsToEvent).toHaveBeenCalledWith(
        mockClient,
        "evt-123",
        "challenge-1",
      );
    });

    it("deve ignorar missão que não pertence ao evento", async () => {
      mockChallengeBelongsToEvent.mockResolvedValue(false);

      const input = createValidInput({ desafioId: "challenge-999" });
      const result = await confirmUpload(input, mockPool);

      expect(result.ok).toBe(true);
      expect(mockConfirmUploadDB).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          challengeId: null,
        }),
      );
    });

    it("deve rejeitar confessionário sem vídeo", async () => {
      mockIsValidConfessionPrompt.mockReturnValue(true);
      mockWithEvent.mockImplementation(async (_client, _eventId, fn) => fn(mockClient));

      const input = createValidInput({
        mime: "image/jpeg",
        promptKey: "confession-1",
      });

      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: false,
        code: "confessionario.video",
        message: "O confessionário pede um vídeo",
      });
    });

    it("deve aceitar confessionário com vídeo", async () => {
      mockIsValidConfessionPrompt.mockReturnValue(true);

      const input = createValidInput({
        mime: "video/mp4",
        promptKey: "confession-1",
      });

      const result = await confirmUpload(input, mockPool);

      expect(result.ok).toBe(true);
      expect(mockConfirmUploadDB).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          promptKey: "confession-1",
        }),
      );
    });

    it("deve rejeitar imagem acima do limite do plano", async () => {
      mockPlanoDoEvento.mockResolvedValue("basic");
      mockWithinPlanDimensions.mockReturnValue({
        ok: false,
        limite: 2048,
        ladoMaior: 4000,
      });

      const input = createValidInput({
        mime: "image/jpeg",
        largura: 4000,
        altura: 3000,
      });

      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: false,
        code: "upload.resolucao_acima_do_plano",
        message: "A foto passou do tamanho do plano",
        details: {
          limite: 2048,
          ladoMaior: 4000,
        },
      });
    });

    it("não deve validar resolução para vídeos", async () => {
      const input = createValidInput({
        mime: "video/mp4",
        largura: 10000,
        altura: 8000,
      });

      const result = await confirmUpload(input, mockPool);

      expect(result.ok).toBe(true);
      expect(mockWithinPlanDimensions).not.toHaveBeenCalled();
    });
  });

  describe("Confirmação de upload", () => {
    beforeEach(() => {
      mockValidarObjetoRecebido.mockReturnValue(null);
      mockEventPack.mockResolvedValue("wedding");
      mockEventTimeZone.mockResolvedValue("America/Sao_Paulo");
      mockWithEvent.mockImplementation(async (_client, _eventId, fn) => fn(mockClient));
    });

    it("deve confirmar upload com sucesso (estado: criado)", async () => {
      mockConfirmUploadDB.mockResolvedValue({ estado: "criado" });
      mockPlanoDoEvento.mockResolvedValue("premium");
      mockWithinPlanDimensions.mockReturnValue({ ok: true });

      const input = createValidInput();
      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: true,
        uploadId: "upl-789",
        estado: "criado",
      });
    });

    it("deve confirmar upload com sucesso (estado: duplicado)", async () => {
      mockConfirmUploadDB.mockResolvedValue({ estado: "ja_existia" });

      const input = createValidInput({ mime: "video/mp4" });
      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: true,
        uploadId: "upl-789",
        estado: "duplicado",
      });
    });

  });

  describe("Story (degradável)", () => {
    beforeEach(() => {
      mockValidarObjetoRecebido.mockReturnValue(null);
      mockEventPack.mockResolvedValue("wedding");
      mockEventTimeZone.mockResolvedValue("America/Sao_Paulo");
      mockConfirmUploadDB.mockResolvedValue({ estado: "criado" });
      mockWithEvent.mockImplementation(async (_client, _eventId, fn) => fn(mockClient));
    });

    it("deve criar story quando solicitado", async () => {
      mockCreateStory.mockResolvedValue(undefined);
      (mockClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const input = createValidInput({ story: true, musicTrackId: "track-1" });
      const result = await confirmUpload(input, mockPool);

      expect(result.ok).toBe(true);
      expect(mockCreateStory).toHaveBeenCalledWith(mockClient, {
        eventoId: "evt-123",
        sessaoId: "sess-456",
        uploadId: "upl-789",
        musicTrackId: "track-1",
      });
      expect(mockClient.query).toHaveBeenCalledWith("SAVEPOINT marcar_story");
      expect(mockClient.query).toHaveBeenCalledWith("RELEASE SAVEPOINT marcar_story");
    });

    it("deve degradar graciosamente se story falhar", async () => {
      mockCreateStory.mockRejectedValue(new Error("Story failed"));
      (mockClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const input = createValidInput({ story: true });
      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: true,
        uploadId: "upl-789",
        estado: "criado",
      });
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK TO SAVEPOINT marcar_story");
    });

    it("não deve criar story quando não solicitado", async () => {
      const input = createValidInput({ story: false });
      const result = await confirmUpload(input, mockPool);

      expect(result.ok).toBe(true);
      expect(mockCreateStory).not.toHaveBeenCalled();
      expect(mockClient.query).not.toHaveBeenCalledWith("SAVEPOINT marcar_story");
    });
  });

  describe("Tratamento de erros", () => {
    beforeEach(() => {
      mockValidarObjetoRecebido.mockReturnValue(null);
    });

    it("deve tratar UploadConflictError", async () => {
      const { UploadConflictError } = await import("@albora/db");
      mockWithEvent.mockRejectedValue(new UploadConflictError("Chave não pertence ao evento"));

      const input = createValidInput();
      const result = await confirmUpload(input, mockPool);

      expect(result).toEqual({
        ok: false,
        code: "upload.chave_invalida",
        message: "Chave não pertence a este evento",
      });
    });

    it("deve propagar outros erros", async () => {
      mockWithEvent.mockRejectedValue(new Error("Database error"));

      const input = createValidInput();

      await expect(confirmUpload(input, mockPool)).rejects.toThrow("Database error");
    });

    it("nunca toca a conexão quando a validação falha antes do withEvent", async () => {
      mockValidarObjetoRecebido.mockReturnValue({
        code: "upload.mime_invalido",
        details: {},
      });

      const input = createValidInput();
      const result = await confirmUpload(input, mockPool);

      expect(result.ok).toBe(false);
      // Validação precoce: falha antes de qualquer chamada a withEvent (conexão nunca é tocada).
      expect(mockWithEvent).not.toHaveBeenCalled();
    });
  });
});
