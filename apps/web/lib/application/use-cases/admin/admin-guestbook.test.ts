/**
 * Testes: Admin Guestbook Use Cases
 * 
 * Cobertura:
 * - getAdminGuestbook: carrega recado do casal para admin
 * - upsertGuestbook: cria ou atualiza recado
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAdminGuestbook } from "./get-admin-guestbook";
import { upsertGuestbook } from "./upsert-guestbook";
import type { Pool, PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockEventGuestbook,
  mockInsertGuestbook,
  mockUpdateGuestbook,
  mockValidateGuestbookCreation,
  mockValidateGuestbookDraft,
  mockSignGuestbookAudio,
  GuestbookExistsError,
} = vi.hoisted(() => {
  class GuestbookExistsErrorMock extends Error {
    constructor() {
      super("Guestbook já existe");
      this.name = "GuestbookExistsError";
    }
  }

  return {
    mockWithEvent: vi.fn(),
    mockEventGuestbook: vi.fn(),
    mockInsertGuestbook: vi.fn(),
    mockUpdateGuestbook: vi.fn(),
    mockValidateGuestbookCreation: vi.fn(),
    mockValidateGuestbookDraft: vi.fn(),
    mockSignGuestbookAudio: vi.fn(),
    GuestbookExistsError: GuestbookExistsErrorMock,
  };
});

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  eventGuestbook: mockEventGuestbook,
  insertGuestbook: mockInsertGuestbook,
  updateGuestbook: mockUpdateGuestbook,
  GuestbookExistsError,
}));

vi.mock("@albora/core", () => ({
  validateGuestbookCreation: mockValidateGuestbookCreation,
  validateGuestbookDraft: mockValidateGuestbookDraft,
}));

vi.mock("@/lib/infrastructure/api/handlers/guestbook-audio-url", () => ({
  signGuestbookAudio: mockSignGuestbookAudio,
}));

describe("getAdminGuestbook", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    ...overrides,
  });

  it("deve carregar recado do casal com sucesso", async () => {
    const recadoMock = {
      id: "rec-1",
      texto: "Obrigado por vir!",
      audio: "audio-key",
      publicaEm: new Date("2026-09-01T10:00:00Z"),
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoMock);
    mockSignGuestbookAudio.mockResolvedValue({
      chave: "audio-key",
      urlAssinada: "https://r2.example.com/audio",
    });

    const input = createInput();
    const result = await getAdminGuestbook(input, mockPool);

    expect(result.recado).not.toBeNull();
    expect(result.recado?.id).toBe("rec-1");
    expect(result.recado?.texto).toBe("Obrigado por vir!");
    expect(result.recado?.publicaEm).toBe("2026-09-01T10:00:00.000Z");
    expect(result.recado?.audio).toEqual({
      chave: "audio-key",
      urlAssinada: "https://r2.example.com/audio",
    });

    expect(mockWithEvent).toHaveBeenCalledWith(mockPool, "evt-123", expect.any(Function));
    expect(mockEventGuestbook).toHaveBeenCalledWith(expect.anything(), "evt-123");
    expect(mockSignGuestbookAudio).toHaveBeenCalledWith("audio-key");
  });

  it("deve retornar null quando não há recado", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(null);

    const input = createInput();
    const result = await getAdminGuestbook(input, mockPool);

    expect(result.recado).toBeNull();
    expect(mockSignGuestbookAudio).not.toHaveBeenCalled();
  });

  it("deve serializar recado sem publicaEm", async () => {
    const recadoMock = {
      id: "rec-1",
      texto: "Texto",
      audio: null,
      publicaEm: null,
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoMock);
    mockSignGuestbookAudio.mockResolvedValue(null);

    const input = createInput();
    const result = await getAdminGuestbook(input, mockPool);

    expect(result.recado?.publicaEm).toBeNull();
  });

  it("deve assinar áudio quando presente", async () => {
    const recadoMock = {
      id: "rec-1",
      texto: "Texto",
      audio: "audio-key-123",
      publicaEm: null,
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoMock);
    mockSignGuestbookAudio.mockResolvedValue({
      chave: "audio-key-123",
      urlAssinada: "https://r2.example.com/audio-123",
    });

    const input = createInput();
    await getAdminGuestbook(input, mockPool);

    expect(mockSignGuestbookAudio).toHaveBeenCalledWith("audio-key-123");
  });
});

describe("upsertGuestbook", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    texto: "Bem-vindos!",
    publicaEm: new Date("2026-09-01T10:00:00Z"),
    ...overrides,
  });

  it("deve criar recado quando não existe", async () => {
    const recadoCriado = {
      id: "rec-new",
      texto: "Bem-vindos!",
      audio: null,
      publicaEm: new Date("2026-09-01T10:00:00Z"),
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(null);
    mockValidateGuestbookCreation.mockReturnValue(null);
    mockInsertGuestbook.mockResolvedValue(recadoCriado);
    mockSignGuestbookAudio.mockResolvedValue(null);

    const input = createInput();
    const result = await upsertGuestbook(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recado.id).toBe("rec-new");
      expect(result.recado.texto).toBe("Bem-vindos!");
    }

    expect(mockValidateGuestbookCreation).toHaveBeenCalled();
    expect(mockInsertGuestbook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventoId: "evt-123",
        texto: "Bem-vindos!",
        publicaEm: expect.any(Date),
      }),
    );
    expect(mockUpdateGuestbook).not.toHaveBeenCalled();
  });

  it("deve atualizar recado quando já existe", async () => {
    const recadoExistente = {
      id: "rec-existing",
      texto: "Texto antigo",
      audio: null,
      publicaEm: null,
    };
    const recadoAtualizado = {
      id: "rec-existing",
      texto: "Texto novo",
      audio: null,
      publicaEm: new Date("2026-09-01T10:00:00Z"),
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoExistente);
    mockValidateGuestbookDraft.mockReturnValue(null);
    mockUpdateGuestbook.mockResolvedValue(recadoAtualizado);
    mockSignGuestbookAudio.mockResolvedValue(null);

    const input = createInput({ texto: "Texto novo" });
    const result = await upsertGuestbook(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recado.texto).toBe("Texto novo");
    }

    expect(mockValidateGuestbookDraft).toHaveBeenCalled();
    expect(mockUpdateGuestbook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventoId: "evt-123",
        texto: "Texto novo",
      }),
    );
    expect(mockInsertGuestbook).not.toHaveBeenCalled();
  });

  it("deve rejeitar criação com erro de validação", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(null);
    mockValidateGuestbookCreation.mockReturnValue({
      code: "recado.texto_vazio",
      details: {},
    });

    const input = createInput({ texto: "" });
    const result = await upsertGuestbook(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erro.code).toBe("recado.texto_vazio");
    }

    expect(mockInsertGuestbook).not.toHaveBeenCalled();
  });

  it("deve rejeitar atualização com erro de validação", async () => {
    const recadoExistente = {
      id: "rec-1",
      texto: "Texto",
      audio: null,
      publicaEm: null,
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoExistente);
    mockValidateGuestbookDraft.mockReturnValue({
      code: "recado.texto_muito_longo",
      details: { maxLength: 500 },
    });

    const input = createInput({ texto: "x".repeat(600) });
    const result = await upsertGuestbook(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erro.code).toBe("recado.texto_muito_longo");
    }

    expect(mockUpdateGuestbook).not.toHaveBeenCalled();
  });

  it("deve trimar texto antes de salvar", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(null);
    mockValidateGuestbookCreation.mockReturnValue(null);
    mockInsertGuestbook.mockResolvedValue({
      id: "rec-1",
      texto: "Texto trimado",
      audio: null,
      publicaEm: null,
    });
    mockSignGuestbookAudio.mockResolvedValue(null);

    const input = createInput({ texto: "  Texto trimado  " });
    await upsertGuestbook(input, mockPool);

    expect(mockInsertGuestbook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        texto: "Texto trimado",
      }),
    );
  });

  it("deve aceitar publicaEm null", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(null);
    mockValidateGuestbookCreation.mockReturnValue(null);
    mockInsertGuestbook.mockResolvedValue({
      id: "rec-1",
      texto: "Texto",
      audio: null,
      publicaEm: null,
    });
    mockSignGuestbookAudio.mockResolvedValue(null);

    const input = createInput({ publicaEm: null });
    const result = await upsertGuestbook(input, mockPool);

    expect(result.ok).toBe(true);
    expect(mockInsertGuestbook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        publicaEm: null,
      }),
    );
  });

  it("deve tratar GuestbookExistsError", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockRejectedValue(new GuestbookExistsError());

    const input = createInput();
    const result = await upsertGuestbook(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erro.code).toBe("recado.ja_existe");
    }
  });

  it("deve registrar log de recado salvo", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(null);
    mockValidateGuestbookCreation.mockReturnValue(null);
    mockInsertGuestbook.mockResolvedValue({
      id: "rec-1",
      texto: "Texto",
      audio: null,
      publicaEm: null,
    });
    mockSignGuestbookAudio.mockResolvedValue(null);

    const input = createInput();
    await upsertGuestbook(input, mockPool);

    expect(consoleSpy).toHaveBeenCalledWith(
      "admin.recado_salvo",
      { eventId: "evt-123" },
    );

    consoleSpy.mockRestore();
  });

  it("deve usar recado existente quando update retorna null", async () => {
    const recadoExistente = {
      id: "rec-existing",
      texto: "Texto original",
      audio: null,
      publicaEm: null,
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoExistente);
    mockValidateGuestbookDraft.mockReturnValue(null);
    mockUpdateGuestbook.mockResolvedValue(null);
    mockSignGuestbookAudio.mockResolvedValue(null);

    const input = createInput();
    const result = await upsertGuestbook(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recado.id).toBe("rec-existing");
    }
  });
});
