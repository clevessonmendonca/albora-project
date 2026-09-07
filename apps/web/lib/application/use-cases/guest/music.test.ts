/**
 * Testes: Music Use Cases
 * 
 * Cobertura:
 * - getGuestMusic: lista música escolhida e sugestões
 * - suggestMusic: adiciona sugestão com validações
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getGuestMusic } from "./get-guest-music";
import { suggestMusic } from "./suggest-music";
import type { Pool, PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockEventGate,
  mockMusicaDoCasal,
  mockListarSugestoes,
  mockAdicionarSugestao,
  mockInteractionMode,
  mockOrdenarSugestoes,
  mockParseMusicLink,
  mockChaveDaFaixa,
  mockRegistrarSugestao,
  mockBuscarMetadadoDaMusica,
} = vi.hoisted(() => ({
  mockWithEvent: vi.fn(),
  mockEventGate: vi.fn(),
  mockMusicaDoCasal: vi.fn(),
  mockListarSugestoes: vi.fn(),
  mockAdicionarSugestao: vi.fn(),
  mockInteractionMode: vi.fn(),
  mockOrdenarSugestoes: vi.fn((arr: unknown[]) => arr),
  mockParseMusicLink: vi.fn(),
  mockChaveDaFaixa: vi.fn(),
  mockRegistrarSugestao: vi.fn(),
  mockBuscarMetadadoDaMusica: vi.fn(),
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  eventGate: mockEventGate,
  musicaDoCasal: mockMusicaDoCasal,
  listarSugestoes: mockListarSugestoes,
  adicionarSugestao: mockAdicionarSugestao,
}));

vi.mock("@albora/core", () => ({
  interactionMode: mockInteractionMode,
  ordenarSugestoes: mockOrdenarSugestoes,
  parseMusicLink: mockParseMusicLink,
  chaveDaFaixa: mockChaveDaFaixa,
  registrarSugestao: mockRegistrarSugestao,
}));

vi.mock("@/lib/music-metadata", () => ({
  buscarMetadadoDaMusica: mockBuscarMetadadoDaMusica,
}));

describe("getGuestMusic", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    ...overrides,
  });

  it("deve listar música escolhida e sugestões", async () => {
    const escolhidaMock = {
      id: "mus-1",
      titulo: "Música do Casal",
      artista: "Artista",
    };
    const sugestoesMock = [
      { id: "sug-1", titulo: "Sugestão 1" },
      { id: "sug-2", titulo: "Sugestão 2" },
    ];
    const gateMock = { interacao: { aberturaEm: new Date() } };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGate.mockResolvedValue(gateMock);
    mockMusicaDoCasal.mockResolvedValue(escolhidaMock);
    mockListarSugestoes.mockResolvedValue(sugestoesMock);
    mockInteractionMode.mockReturnValue("aberto");

    const input = createInput();
    const result = await getGuestMusic(input, mockPool);

    expect(result.escolhida).toEqual(escolhidaMock);
    expect(result.sugestoes).toEqual(sugestoesMock);
    expect(result.interacao).toBe("aberto");

    expect(mockWithEvent).toHaveBeenCalledWith(mockPool, "evt-123", expect.any(Function));
    expect(mockEventGate).toHaveBeenCalledWith(expect.anything(), "evt-123");
    expect(mockMusicaDoCasal).toHaveBeenCalledWith(expect.anything(), "evt-123");
    expect(mockListarSugestoes).toHaveBeenCalledWith(expect.anything(), "evt-123");
  });

  it("deve retornar modo espelho quando não há gate", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGate.mockResolvedValue(null);
    mockMusicaDoCasal.mockResolvedValue(null);
    mockListarSugestoes.mockResolvedValue([]);

    const input = createInput();
    const result = await getGuestMusic(input, mockPool);

    expect(result.interacao).toBe("espelho");
    expect(mockInteractionMode).not.toHaveBeenCalled();
  });

  it("deve ordenar sugestões antes de retornar", async () => {
    const sugestoesDesordenadas = [
      { id: "sug-2", ordem: 2 },
      { id: "sug-1", ordem: 1 },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGate.mockResolvedValue(null);
    mockMusicaDoCasal.mockResolvedValue(null);
    mockListarSugestoes.mockResolvedValue(sugestoesDesordenadas);

    const input = createInput();
    await getGuestMusic(input, mockPool);

    expect(mockOrdenarSugestoes).toHaveBeenCalledWith(sugestoesDesordenadas);
  });

  it("deve retornar array vazio quando não há sugestões", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockEventGate.mockResolvedValue(null);
    mockMusicaDoCasal.mockResolvedValue(null);
    mockListarSugestoes.mockResolvedValue([]);

    const input = createInput();
    const result = await getGuestMusic(input, mockPool);

    expect(result.sugestoes).toEqual([]);
  });
});

describe("suggestMusic", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    sessaoId: "ses-456",
    url: "https://open.spotify.com/track/abc",
    ...overrides,
  });

  it("deve adicionar sugestão com sucesso", async () => {
    const linkMock = { provedor: "spotify", id: "abc" };
    const metadadoMock = { titulo: "Música Teste", artista: "Artista" };
    const sugestoesAtualizadas = [{ id: "sug-1", titulo: "Música Teste" }];

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockChaveDaFaixa.mockReturnValue("spotify:abc");
    mockBuscarMetadadoDaMusica.mockResolvedValue(metadadoMock);
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListarSugestoes.mockResolvedValue([]);
    mockEventGate.mockResolvedValue({ interacao: { aberturaEm: new Date() } });
    mockRegistrarSugestao.mockReturnValue({ ok: true });
    mockAdicionarSugestao.mockResolvedValue(undefined);
    mockOrdenarSugestoes.mockReturnValue(sugestoesAtualizadas);

    const input = createInput();
    const result = await suggestMusic(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sugestoes).toEqual(sugestoesAtualizadas);
    }

    expect(mockParseMusicLink).toHaveBeenCalledWith(input.url);
    expect(mockAdicionarSugestao).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventoId: "evt-123",
        sessaoId: "ses-456",
        link: linkMock,
        metadado: metadadoMock,
      }),
    );
  });

  it("deve rejeitar link inválido", async () => {
    mockParseMusicLink.mockReturnValue({
      ok: false,
      erro: {
        code: "musica.link_invalido",
        details: { url: "invalid" },
      },
    });

    const input = createInput({ url: "invalid-url" });
    const result = await suggestMusic(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("musica.link_invalido");
      expect(result.message).toBe("Link não aceito");
    }

    expect(mockWithEvent).not.toHaveBeenCalled();
  });

  it("deve recusar quando gate está fechado", async () => {
    const linkMock = { provedor: "spotify", id: "abc" };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockChaveDaFaixa.mockReturnValue("spotify:abc");
    mockBuscarMetadadoDaMusica.mockResolvedValue({ titulo: "Teste" });
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListarSugestoes.mockResolvedValue([]);
    mockEventGate.mockResolvedValue(null);

    const input = createInput();
    const result = await suggestMusic(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("musica.interacao_fechada");
      expect(result.message).toBe("A interação ainda não abriu");
    }
  });

  it("deve recusar quando sugestão não passa validação", async () => {
    const linkMock = { provedor: "spotify", id: "abc" };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockChaveDaFaixa.mockReturnValue("spotify:abc");
    mockBuscarMetadadoDaMusica.mockResolvedValue({ titulo: "Teste" });
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListarSugestoes.mockResolvedValue([]);
    mockEventGate.mockResolvedValue({ interacao: { aberturaEm: new Date() } });
    mockRegistrarSugestao.mockReturnValue({
      ok: false,
      erro: {
        code: "musica.limite_excedido",
        details: { limite: 5 },
      },
    });

    const input = createInput();
    const result = await suggestMusic(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("musica.limite_excedido");
      expect(result.message).toBe("Sugestão recusada");
    }
  });

  it("deve reutilizar metadado de sugestão existente", async () => {
    const linkMock = { provedor: "spotify", id: "abc" };
    const metadadoExistente = { titulo: "Música Existente", artista: "Artista" };
    const sugestaoExistente = {
      chave: "spotify:abc",
      metadado: metadadoExistente,
    };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockChaveDaFaixa.mockReturnValue("spotify:abc");
    mockWithEvent
      .mockImplementationOnce(async (_pool, _eventId, callback) =>
        callback({} as PoolClient),
      )
      .mockImplementationOnce(async (_pool, _eventId, callback) =>
        callback({} as PoolClient),
      );
    mockListarSugestoes
      .mockResolvedValueOnce([sugestaoExistente])
      .mockResolvedValueOnce([sugestaoExistente]);
    mockEventGate.mockResolvedValue({ interacao: { aberturaEm: new Date() } });
    mockRegistrarSugestao.mockReturnValue({ ok: true });
    mockAdicionarSugestao.mockResolvedValue(undefined);
    mockOrdenarSugestoes.mockReturnValue([sugestaoExistente]);

    const input = createInput();
    await suggestMusic(input, mockPool);

    expect(mockBuscarMetadadoDaMusica).not.toHaveBeenCalled();
    expect(mockAdicionarSugestao).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadado: metadadoExistente,
      }),
    );
  });

  it("deve continuar sem metadado se busca falhar", async () => {
    const linkMock = { provedor: "spotify", id: "abc" };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockChaveDaFaixa.mockReturnValue("spotify:abc");
    mockBuscarMetadadoDaMusica.mockRejectedValue(new Error("API falhou"));
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListarSugestoes.mockResolvedValue([]);
    mockEventGate.mockResolvedValue({ interacao: { aberturaEm: new Date() } });
    mockRegistrarSugestao.mockReturnValue({ ok: true });
    mockAdicionarSugestao.mockResolvedValue(undefined);
    mockOrdenarSugestoes.mockReturnValue([]);

    const input = createInput();
    const result = await suggestMusic(input, mockPool);

    expect(result.ok).toBe(true);
    expect(mockAdicionarSugestao).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadado: null,
      }),
    );
  });

  it("deve ordenar sugestões após adicionar", async () => {
    const linkMock = { provedor: "spotify", id: "abc" };
    const sugestoesAtualizadas = [
      { id: "sug-1" },
      { id: "sug-2" },
    ];

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockChaveDaFaixa.mockReturnValue("spotify:abc");
    mockBuscarMetadadoDaMusica.mockResolvedValue({ titulo: "Teste" });
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListarSugestoes
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(sugestoesAtualizadas);
    mockEventGate.mockResolvedValue({ interacao: { aberturaEm: new Date() } });
    mockRegistrarSugestao.mockReturnValue({ ok: true });
    mockAdicionarSugestao.mockResolvedValue(undefined);
    mockOrdenarSugestoes.mockReturnValue(sugestoesAtualizadas);

    const input = createInput();
    await suggestMusic(input, mockPool);

    expect(mockOrdenarSugestoes).toHaveBeenCalledWith(sugestoesAtualizadas);
  });
});
