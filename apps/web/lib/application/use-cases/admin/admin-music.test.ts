/**
 * Testes: Admin Music Use Cases
 * 
 * Cobertura:
 * - getEventMusic: lista música do casal e sugestões
 * - setEventMusic: define música do casal a partir de link
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEventMusic } from "./get-event-music";
import { setEventMusic } from "./set-event-music";
import type { Pool, PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockMusicaDoCasal,
  mockListarSugestoes,
  mockDefinirMusicaDoCasal,
  mockOrdenarSugestoes,
  mockParseMusicLink,
  mockMetadadoParaFaixaDoCasal,
} = vi.hoisted(() => ({
  mockWithEvent: vi.fn(),
  mockMusicaDoCasal: vi.fn(),
  mockListarSugestoes: vi.fn(),
  mockDefinirMusicaDoCasal: vi.fn(),
  mockOrdenarSugestoes: vi.fn((arr: unknown[]) => arr),
  mockParseMusicLink: vi.fn(),
  mockMetadadoParaFaixaDoCasal: vi.fn(),
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  musicaDoCasal: mockMusicaDoCasal,
  listarSugestoes: mockListarSugestoes,
  definirMusicaDoCasal: mockDefinirMusicaDoCasal,
}));

vi.mock("@albora/core", () => ({
  ordenarSugestoes: mockOrdenarSugestoes,
  parseMusicLink: mockParseMusicLink,
}));

vi.mock("@/lib/music-track", () => ({
  metadadoParaFaixaDoCasal: mockMetadadoParaFaixaDoCasal,
}));

describe("getEventMusic", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    ...overrides,
  });

  it("deve carregar música do casal e sugestões", async () => {
    const musicaMock = {
      id: "mus-1",
      titulo: "Perfect",
      artista: "Ed Sheeran",
      link: { provedor: "spotify", id: "abc123" },
    };
    const sugestoesMock = [
      { id: "sug-1", titulo: "Sugestão 1", sessaoId: "ses-1" },
      { id: "sug-2", titulo: "Sugestão 2", sessaoId: "ses-2" },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockMusicaDoCasal.mockResolvedValue(musicaMock);
    mockListarSugestoes.mockResolvedValue(sugestoesMock);

    const input = createInput();
    const result = await getEventMusic(input, mockPool);

    expect(result.musica).toEqual(musicaMock);
    expect(result.sugestoes).toEqual(sugestoesMock);

    expect(mockWithEvent).toHaveBeenCalledWith(mockPool, "evt-123", expect.any(Function));
    expect(mockMusicaDoCasal).toHaveBeenCalledWith(expect.anything(), "evt-123");
    expect(mockListarSugestoes).toHaveBeenCalledWith(expect.anything(), "evt-123");
  });

  it("deve ordenar sugestões antes de retornar", async () => {
    const sugestoesDesordenadas = [
      { id: "sug-2", ordem: 2 },
      { id: "sug-1", ordem: 1 },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockMusicaDoCasal.mockResolvedValue(null);
    mockListarSugestoes.mockResolvedValue(sugestoesDesordenadas);

    const input = createInput();
    await getEventMusic(input, mockPool);

    expect(mockOrdenarSugestoes).toHaveBeenCalledWith(sugestoesDesordenadas);
  });

  it("deve funcionar sem música do casal", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockMusicaDoCasal.mockResolvedValue(null);
    mockListarSugestoes.mockResolvedValue([]);

    const input = createInput();
    const result = await getEventMusic(input, mockPool);

    expect(result.musica).toBeNull();
    expect(result.sugestoes).toEqual([]);
  });

  it("deve funcionar sem sugestões", async () => {
    const musicaMock = {
      id: "mus-1",
      titulo: "Song",
      artista: "Artist",
    };

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockMusicaDoCasal.mockResolvedValue(musicaMock);
    mockListarSugestoes.mockResolvedValue([]);

    const input = createInput();
    const result = await getEventMusic(input, mockPool);

    expect(result.musica).toEqual(musicaMock);
    expect(result.sugestoes).toEqual([]);
  });
});

describe("setEventMusic", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    url: "https://open.spotify.com/track/abc123",
    ...overrides,
  });

  it("deve definir música do casal com sucesso", async () => {
    const linkMock = { provedor: "spotify", id: "abc123" };
    const metadadoMock = {
      titulo: "Perfect",
      artista: "Ed Sheeran",
      capa: "https://i.scdn.co/image/abc",
    };
    const musicaDefinida = {
      id: "mus-1",
      titulo: "Perfect",
      artista: "Ed Sheeran",
      link: linkMock,
      metadado: metadadoMock,
    };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockMetadadoParaFaixaDoCasal.mockResolvedValue(metadadoMock);
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockDefinirMusicaDoCasal.mockResolvedValue(undefined);
    mockMusicaDoCasal.mockResolvedValue(musicaDefinida);

    const input = createInput();
    const result = await setEventMusic(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.musica).toEqual(musicaDefinida);
      expect(result.provedor).toBe("spotify");
    }

    expect(mockParseMusicLink).toHaveBeenCalledWith("https://open.spotify.com/track/abc123");
    expect(mockMetadadoParaFaixaDoCasal).toHaveBeenCalledWith(linkMock);
    expect(mockDefinirMusicaDoCasal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventoId: "evt-123",
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
    const result = await setEventMusic(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("musica.link_invalido");
      expect(result.message).toBe("Link não aceito");
    }

    expect(mockDefinirMusicaDoCasal).not.toHaveBeenCalled();
  });

  it("deve aceitar link do YouTube", async () => {
    const linkMock = { provedor: "youtube", id: "xyz789" };
    const metadadoMock = { titulo: "Song", artista: "Artist" };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockMetadadoParaFaixaDoCasal.mockResolvedValue(metadadoMock);
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockDefinirMusicaDoCasal.mockResolvedValue(undefined);
    mockMusicaDoCasal.mockResolvedValue({
      id: "mus-1",
      link: linkMock,
    });

    const input = createInput({
      url: "https://www.youtube.com/watch?v=xyz789",
    });
    const result = await setEventMusic(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provedor).toBe("youtube");
    }
  });

  it("deve trimar espaços da URL", async () => {
    const linkMock = { provedor: "spotify", id: "abc" };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockMetadadoParaFaixaDoCasal.mockResolvedValue({});
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockDefinirMusicaDoCasal.mockResolvedValue(undefined);
    mockMusicaDoCasal.mockResolvedValue(null);

    const input = createInput({
      url: "  https://open.spotify.com/track/abc  ",
    });
    await setEventMusic(input, mockPool);

    expect(mockParseMusicLink).toHaveBeenCalledWith("https://open.spotify.com/track/abc");
  });

  it("deve continuar mesmo se metadado falhar", async () => {
    const linkMock = { provedor: "spotify", id: "abc" };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockMetadadoParaFaixaDoCasal.mockResolvedValue(null);
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockDefinirMusicaDoCasal.mockResolvedValue(undefined);
    mockMusicaDoCasal.mockResolvedValue({
      id: "mus-1",
      link: linkMock,
      metadado: null,
    });

    const input = createInput();
    const result = await setEventMusic(input, mockPool);

    expect(result.ok).toBe(true);
    expect(mockDefinirMusicaDoCasal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadado: null,
      }),
    );
  });

  it("deve rejeitar link de provedor não suportado", async () => {
    mockParseMusicLink.mockReturnValue({
      ok: false,
      erro: {
        code: "musica.provedor_nao_suportado",
        details: { provedor: "soundcloud" },
      },
    });

    const input = createInput({
      url: "https://soundcloud.com/track/123",
    });
    const result = await setEventMusic(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("musica.provedor_nao_suportado");
    }
  });

  it("deve carregar música definida após atualização", async () => {
    const linkMock = { provedor: "spotify", id: "new" };
    const musicaNova = {
      id: "mus-2",
      titulo: "Nova Música",
      artista: "Novo Artista",
      link: linkMock,
    };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockMetadadoParaFaixaDoCasal.mockResolvedValue({});
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockDefinirMusicaDoCasal.mockResolvedValue(undefined);
    mockMusicaDoCasal.mockResolvedValue(musicaNova);

    const input = createInput();
    const result = await setEventMusic(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.musica).toEqual(musicaNova);
    }

    expect(mockMusicaDoCasal).toHaveBeenCalledWith(expect.anything(), "evt-123");
  });

  it("deve registrar log de música definida", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const linkMock = { provedor: "spotify", id: "abc" };

    mockParseMusicLink.mockReturnValue({ ok: true, link: linkMock });
    mockMetadadoParaFaixaDoCasal.mockResolvedValue({});
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockDefinirMusicaDoCasal.mockResolvedValue(undefined);
    mockMusicaDoCasal.mockResolvedValue(null);

    const input = createInput();
    await setEventMusic(input, mockPool);

    expect(consoleSpy).toHaveBeenCalledWith(
      "admin.musica_definida",
      expect.objectContaining({
        accountId: "acc-456",
        eventId: "evt-123",
        provedor: "spotify",
      }),
    );

    consoleSpy.mockRestore();
  });
});
