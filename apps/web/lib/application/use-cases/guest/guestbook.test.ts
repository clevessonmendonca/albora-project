/**
 * Testes: Guestbook Use Cases
 * 
 * Cobertura:
 * - getGuestbook: carrega recado do casal
 * - markGuestbookReadUseCase: marca recado como lido
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getGuestbook } from "./get-guestbook";
import { markGuestbookReadUseCase } from "./mark-guestbook-read";
import type { Pool, PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockEventGuestbook,
  mockGuestbookReads,
  mockMarkGuestbookRead,
  mockDecideDelivery,
  mockBuildGuestbookScreen,
  mockGuestbookScreenHasContent,
} = vi.hoisted(() => ({
  mockWithEvent: vi.fn(),
  mockEventGuestbook: vi.fn(),
  mockGuestbookReads: vi.fn(),
  mockMarkGuestbookRead: vi.fn(),
  mockDecideDelivery: vi.fn(),
  mockBuildGuestbookScreen: vi.fn(),
  mockGuestbookScreenHasContent: vi.fn(),
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  eventGuestbook: mockEventGuestbook,
  guestbookReads: mockGuestbookReads,
  markGuestbookRead: mockMarkGuestbookRead,
}));

vi.mock("@albora/core", () => ({
  decideDelivery: mockDecideDelivery,
  buildGuestbookScreen: mockBuildGuestbookScreen,
  guestbookScreenHasContent: mockGuestbookScreenHasContent,
}));

describe("getGuestbook", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    sessaoId: "ses-456",
    ...overrides,
  });

  it("deve carregar recado com conteúdo completo", async () => {
    const recadoMock = {
      id: "rec-1",
      titulo: "Bem-vindo!",
      texto: "Obrigado por vir",
      audio: "url-audio",
    };
    const leiturasMock: unknown[] = [];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoMock);
    mockGuestbookReads.mockResolvedValue(leiturasMock);
    mockDecideDelivery.mockReturnValue({
      mostrar: true,
      codigo: "recado.novo",
      recado: recadoMock,
    });
    mockBuildGuestbookScreen.mockReturnValue({
      texto: "Bem-vindo!",
      camera: "url-camera",
      audio: "url-audio",
    });
    mockGuestbookScreenHasContent.mockReturnValue(true);

    const input = createInput();
    const result = await getGuestbook(input, mockPool);

    expect(result.mostrar).toBe(true);
    expect(result.codigo).toBe("recado.novo");
    expect(result.tela.texto).toBe("Bem-vindo!");
    expect(result.tela.audio).toBe("url-audio");
    expect(result.recado).toEqual(recadoMock);
    expect(result.leituras).toEqual(leiturasMock);

    expect(mockWithEvent).toHaveBeenCalledWith(mockPool, "evt-123", expect.any(Function));
    expect(mockEventGuestbook).toHaveBeenCalledWith(expect.anything(), "evt-123");
    expect(mockGuestbookReads).toHaveBeenCalledWith(expect.anything(), "evt-123", "ses-456");
  });

  it("deve retornar recado sem conteúdo quando não há recado", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(null);
    mockGuestbookReads.mockResolvedValue([]);
    mockDecideDelivery.mockReturnValue({
      mostrar: false,
      codigo: "recado.nao_carregado",
      recado: null,
    });
    mockBuildGuestbookScreen.mockReturnValue({
      texto: null,
      camera: null,
      audio: null,
    });
    mockGuestbookScreenHasContent.mockReturnValue(false);

    const input = createInput();
    const result = await getGuestbook(input, mockPool);

    expect(result.mostrar).toBe(false);
    expect(result.codigo).toBe("recado.nao_carregado");
    expect(result.tela.texto).toBeNull();
    expect(result.recado).toBeNull();
  });

  it("deve não mostrar quando tela não tem conteúdo", async () => {
    const recadoMock = { id: "rec-1", titulo: "Teste" };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoMock);
    mockGuestbookReads.mockResolvedValue([]);
    mockDecideDelivery.mockReturnValue({
      mostrar: true,
      codigo: "recado.novo",
      recado: recadoMock,
    });
    mockBuildGuestbookScreen.mockReturnValue({
      texto: null,
      camera: null,
      audio: null,
    });
    mockGuestbookScreenHasContent.mockReturnValue(false);

    const input = createInput();
    const result = await getGuestbook(input, mockPool);

    expect(result.mostrar).toBe(false);
    expect(mockGuestbookScreenHasContent).toHaveBeenCalled();
  });

  it("deve determinar estado do áudio corretamente", async () => {
    const recadoComAudio = {
      id: "rec-1",
      titulo: "Teste",
      audio: "url-audio",
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoComAudio);
    mockGuestbookReads.mockResolvedValue([]);
    mockDecideDelivery.mockReturnValue({
      mostrar: true,
      codigo: "recado.novo",
      recado: recadoComAudio,
    });
    mockBuildGuestbookScreen.mockReturnValue({
      texto: "Teste",
      camera: "url-camera",
      audio: "url-audio",
    });
    mockGuestbookScreenHasContent.mockReturnValue(true);

    const input = createInput();
    await getGuestbook(input, mockPool);

    expect(mockBuildGuestbookScreen).toHaveBeenCalledWith(
      expect.anything(),
      "disponivel",
    );
  });

  it("deve determinar estado do áudio como indisponível quando não há", async () => {
    const recadoSemAudio = {
      id: "rec-1",
      titulo: "Teste",
      audio: null,
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoSemAudio);
    mockGuestbookReads.mockResolvedValue([]);
    mockDecideDelivery.mockReturnValue({
      mostrar: true,
      codigo: "recado.novo",
      recado: recadoSemAudio,
    });
    mockBuildGuestbookScreen.mockReturnValue({
      texto: "Teste",
      camera: "url-camera",
      audio: null,
    });
    mockGuestbookScreenHasContent.mockReturnValue(true);

    const input = createInput();
    await getGuestbook(input, mockPool);

    expect(mockBuildGuestbookScreen).toHaveBeenCalledWith(
      expect.anything(),
      "indisponivel",
    );
  });
});

describe("markGuestbookReadUseCase", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    sessaoId: "ses-456",
    ...overrides,
  });

  it("deve marcar recado como lido com sucesso", async () => {
    const recadoMock = {
      id: "rec-1",
      titulo: "Bem-vindo!",
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoMock);
    mockGuestbookReads.mockResolvedValue([]);
    mockDecideDelivery.mockReturnValue({
      mostrar: true,
      codigo: "recado.novo",
      recado: recadoMock,
    });
    mockMarkGuestbookRead.mockResolvedValue(undefined);

    const input = createInput();
    const result = await markGuestbookReadUseCase(input, mockPool);

    expect(result.lido).toBe(true);
    expect(result.codigo).toBe("recado.ja_lido");
    expect(mockMarkGuestbookRead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventoId: "evt-123",
        sessaoId: "ses-456",
        recadoId: "rec-1",
        lidoEm: expect.any(Date),
      }),
    );
  });

  it("deve retornar já lido quando recado já foi lido", async () => {
    const recadoMock = { id: "rec-1", titulo: "Teste" };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoMock);
    mockGuestbookReads.mockResolvedValue([{ recadoId: "rec-1" }]);
    mockDecideDelivery.mockReturnValue({
      mostrar: false,
      codigo: "recado.ja_lido",
      recado: null,
    });

    const input = createInput();
    const result = await markGuestbookReadUseCase(input, mockPool);

    expect(result.lido).toBe(true);
    expect(result.codigo).toBe("recado.ja_lido");
    expect(mockMarkGuestbookRead).not.toHaveBeenCalled();
  });

  it("deve não marcar quando recado não deve ser mostrado", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(null);
    mockGuestbookReads.mockResolvedValue([]);
    mockDecideDelivery.mockReturnValue({
      mostrar: false,
      codigo: "recado.nao_carregado",
      recado: null,
    });

    const input = createInput();
    const result = await markGuestbookReadUseCase(input, mockPool);

    expect(result.lido).toBe(false);
    expect(result.codigo).toBe("recado.nao_carregado");
    expect(mockMarkGuestbookRead).not.toHaveBeenCalled();
  });

  it("deve passar data atual para decisão de entrega", async () => {
    const recadoMock = { id: "rec-1", titulo: "Teste" };
    const _agora = new Date();

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGuestbook.mockResolvedValue(recadoMock);
    mockGuestbookReads.mockResolvedValue([]);
    mockDecideDelivery.mockReturnValue({
      mostrar: true,
      codigo: "recado.novo",
      recado: recadoMock,
    });
    mockMarkGuestbookRead.mockResolvedValue(undefined);

    const input = createInput();
    await markGuestbookReadUseCase(input, mockPool);

    expect(mockDecideDelivery).toHaveBeenCalledWith(
      recadoMock,
      { id: "ses-456", eventoId: "evt-123" },
      [],
      expect.any(Date),
    );
  });
});
