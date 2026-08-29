/**
 * Testes dos Use Cases: Feed, Event, Missions (list/get)
 * 
 * Use cases de leitura para o app do convidado.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listFeedUseCase,
  type ListFeedInput,
  type ListFeedOutput,
} from "./list-feed";
import {
  getGuestEvent,
  resetGuestEventCache,
  type GetGuestEventInput,
  type GuestEventOutput,
} from "./get-guest-event";
import {
  listGuestMissions,
  type ListGuestMissionsInput,
  type ListGuestMissionsOutput,
} from "./list-guest-missions";
import type { Pool, PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockEventGate,
  mockChallengeBelongsToEvent,
  mockListFeed,
  mockCarregarEventoPublico,
  mockListChallenges,
  mockPackDoEvento,
  mockModoInteracao,
  mockResolvePackText,
  ErroCursorInvalido,
} = vi.hoisted(() => {
  class ErroCursorInvalidoMock extends Error {
    constructor() {
      super("Cursor inválido");
      this.name = "ErroCursorInvalido";
    }
  }

  return {
    mockWithEvent: vi.fn(),
    mockEventGate: vi.fn(),
    mockChallengeBelongsToEvent: vi.fn(),
    mockListFeed: vi.fn(),
    mockCarregarEventoPublico: vi.fn(),
    mockListChallenges: vi.fn(),
    mockPackDoEvento: vi.fn(),
    mockModoInteracao: vi.fn(),
    mockResolvePackText: vi.fn(),
    ErroCursorInvalido: ErroCursorInvalidoMock,
  };
});

// Configuração de mocks
vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  eventGate: mockEventGate,
  challengeBelongsToEvent: mockChallengeBelongsToEvent,
  listFeed: mockListFeed,
  carregarEventoPublico: mockCarregarEventoPublico,
  listChallenges: mockListChallenges,
  packDoEvento: mockPackDoEvento,
  ErroCursorInvalido,
}));

vi.mock("@albora/core", () => ({
  modoInteracao: mockModoInteracao,
}));

vi.mock("@albora/packs", () => ({
  resolvePackText: mockResolvePackText,
  PACKS: {
    wedding: { id: "wedding", nome: "Casamento" },
  },
}));

// Helper para criar mock de PoolClient
function createMockClient(): PoolClient {
  return {
    query: vi.fn(),
    release: vi.fn(),
  } as unknown as PoolClient;
}

describe("Guest Read Use Cases", () => {
  let mockClient: PoolClient;
  let getClient: () => Promise<PoolClient>;
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    resetGuestEventCache();
    mockClient = createMockClient();
    getClient = vi.fn().mockResolvedValue(mockClient);
    mockPool = { connect: vi.fn() } as unknown as Pool;

    // Defaults
    mockWithEvent.mockImplementation(async (_client, _eventId, fn) => fn(mockClient));
    mockEventGate.mockResolvedValue({ visible: true, interactionStartsAt: null });
    mockModoInteracao.mockReturnValue("aberto");
  });

  describe("listFeedUseCase", () => {
    const createListFeedInput = (overrides?: Partial<ListFeedInput>): ListFeedInput => ({
      eventoId: "evt-123",
      sessaoId: "sess-456",
      missaoId: null,
      cursor: null,
      ...overrides,
    });

    it("deve listar feed com sucesso", async () => {
      const feedItens = [
        { uploadId: "upl-1", autor: "João", thumbUrl: "url1" },
        { uploadId: "upl-2", autor: "Maria", thumbUrl: "url2" },
      ];

      mockListFeed.mockResolvedValue({
        itens: feedItens,
        proximoCursor: "cursor-next",
      });

      const input = createListFeedInput();
      const result = await listFeedUseCase(input, getClient);

      expect(result).toEqual({
        itens: feedItens,
        proximoCursor: "cursor-next",
        interacao: "aberto",
      });
    });

    it("deve retornar modo espelho quando gate não existe", async () => {
      mockEventGate.mockResolvedValue(null);

      const input = createListFeedInput();
      const result = await listFeedUseCase(input, getClient);

      expect(result).toEqual({
        itens: [],
        proximoCursor: null,
        interacao: "espelho",
      });

      expect(mockListFeed).not.toHaveBeenCalled();
    });

    it("deve retornar vazio quando missão não pertence ao evento", async () => {
      mockChallengeBelongsToEvent.mockResolvedValue(false);

      const input = createListFeedInput({ missaoId: "mission-999" });
      const result = await listFeedUseCase(input, getClient);

      expect(result).toEqual({
        itens: [],
        proximoCursor: null,
        interacao: "aberto",
      });

      expect(mockListFeed).not.toHaveBeenCalled();
    });

    it("deve filtrar por missão válida", async () => {
      mockChallengeBelongsToEvent.mockResolvedValue(true);
      mockListFeed.mockResolvedValue({
        itens: [{ uploadId: "upl-mission" }],
        proximoCursor: null,
      });

      const input = createListFeedInput({ missaoId: "mission-1" });
      await listFeedUseCase(input, getClient);

      expect(mockListFeed).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          missaoId: "mission-1",
        }),
      );
    });

    it("deve suportar paginação com cursor", async () => {
      mockListFeed.mockResolvedValue({
        itens: [],
        proximoCursor: "cursor-page2",
      });

      const input = createListFeedInput({ cursor: "cursor-page1" });
      await listFeedUseCase(input, getClient);

      expect(mockListFeed).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          cursor: "cursor-page1",
        }),
      );
    });

    it("deve retornar diferentes modos de interação", async () => {
      const modos = ["espelho", "aberto", "limitado"] as const;

      for (const modo of modos) {
        mockModoInteracao.mockReturnValue(modo);
        mockListFeed.mockResolvedValue({ itens: [], proximoCursor: null });

        const input = createListFeedInput();
        const result = await listFeedUseCase(input, getClient);

        expect(result.interacao).toBe(modo);
      }
    });

    it("deve liberar client após execução", async () => {
      mockListFeed.mockResolvedValue({ itens: [], proximoCursor: null });

      const input = createListFeedInput();
      await listFeedUseCase(input, getClient);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("getGuestEvent", () => {
    const createGetEventInput = (
      overrides?: Partial<GetGuestEventInput>,
    ): GetGuestEventInput => ({
      eventoId: "evt-123",
      ...overrides,
    });

    it("deve carregar dados públicos do evento", async () => {
      const eventoPublico = {
        eventoId: "evt-123",
        packId: "wedding",
        identityTokens: { primary: "var(--color-primary)", secondary: "var(--color-secondary)" },
        vendorBrandTokens: { logo: "url-logo" },
        filtroRecomendado: "warm",
        fuso: "America/Sao_Paulo",
      };

      mockCarregarEventoPublico.mockResolvedValue(eventoPublico);

      const input = createGetEventInput();
      const result = await getGuestEvent(input, mockPool);

      expect(result).toEqual(eventoPublico);
    });

    it("deve retornar null quando evento não existe", async () => {
      mockCarregarEventoPublico.mockResolvedValue(null);

      const input = createGetEventInput({ eventoId: "evt-inexistente" });
      const result = await getGuestEvent(input, mockPool);

      expect(result).toBeNull();
    });

    it("deve incluir tokens de identidade visual", async () => {
      mockCarregarEventoPublico.mockResolvedValue({
        eventoId: "evt-123",
        packId: "wedding",
        identityTokens: { fontFamily: "Playfair", spacing: "16px" },
        vendorBrandTokens: null,
        filtroRecomendado: null,
        fuso: "UTC",
      });

      const input = createGetEventInput();
      const result = await getGuestEvent(input, mockPool);

      expect(result?.identityTokens).toEqual({
        fontFamily: "Playfair",
        spacing: "16px",
      });
    });

    it("reusa o resultado por 60s sem nova consulta", async () => {
      vi.useFakeTimers();
      const eventoPublico = {
        eventoId: "evt-123",
        packId: "wedding",
        identityTokens: { fontFamily: "Playfair" },
        vendorBrandTokens: null,
        filtroRecomendado: null,
        fuso: "UTC",
      };
      mockCarregarEventoPublico.mockResolvedValue(eventoPublico);

      const input = createGetEventInput();
      await getGuestEvent(input, mockPool);
      await getGuestEvent(input, mockPool);

      expect(mockCarregarEventoPublico).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60_000);
      await getGuestEvent(input, mockPool);
      expect(mockCarregarEventoPublico).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it("nao cacheia evento ausente", async () => {
      mockCarregarEventoPublico.mockResolvedValue(null);

      const input = createGetEventInput();
      await getGuestEvent(input, mockPool);
      await getGuestEvent(input, mockPool);

      expect(mockCarregarEventoPublico).toHaveBeenCalledTimes(2);
    });
  });

  describe("listGuestMissions", () => {
    const createListMissionsInput = (
      overrides?: Partial<ListGuestMissionsInput>,
    ): ListGuestMissionsInput => ({
      eventoId: "evt-123",
      sessaoId: "sess-456",
      ...overrides,
    });

    it("deve listar missões com status", async () => {
      const desafios = [
        {
          id: "mission-1",
          tituloCustom: null,
          chaveTitulo: "first_dance",
          emoji: "💃",
          feito: true,
        },
        {
          id: "mission-2",
          tituloCustom: "Foto com os noivos",
          chaveTitulo: null,
          emoji: "📸",
          feito: false,
        },
      ];

      mockListChallenges.mockResolvedValue(desafios);
      mockPackDoEvento.mockResolvedValue("wedding");
      mockResolvePackText.mockReturnValue("Primeira dança");

      const input = createListMissionsInput();
      const result = await listGuestMissions(input, getClient);

      expect(result.missoes).toHaveLength(2);
      expect(result.missoes[0]).toEqual({
        id: "mission-1",
        titulo: "Primeira dança",
        emoji: "💃",
        feito: true,
      });
      expect(result.missoes[1]).toEqual({
        id: "mission-2",
        titulo: "Foto com os noivos",
        emoji: "📸",
        feito: false,
      });
    });

    it("deve priorizar título customizado sobre pack", async () => {
      mockListChallenges.mockResolvedValue([
        {
          id: "m1",
          tituloCustom: "Título Personalizado",
          chaveTitulo: "pack_title",
          emoji: null,
          feito: false,
        },
      ]);
      mockPackDoEvento.mockResolvedValue("wedding");
      mockResolvePackText.mockReturnValue("Título do Pack");

      const input = createListMissionsInput();
      const result = await listGuestMissions(input, getClient);

      expect(result.missoes[0].titulo).toBe("Título Personalizado");
    });

    it("deve retornar array vazio quando não há missões", async () => {
      mockListChallenges.mockResolvedValue([]);
      mockPackDoEvento.mockResolvedValue("wedding");

      const input = createListMissionsInput();
      const result = await listGuestMissions(input, getClient);

      expect(result.missoes).toEqual([]);
    });

    it("deve funcionar sem pack configurado", async () => {
      mockListChallenges.mockResolvedValue([
        {
          id: "m1",
          tituloCustom: "Missão sem pack",
          chaveTitulo: null,
          emoji: "🎯",
          feito: false,
        },
      ]);
      mockPackDoEvento.mockResolvedValue(null);

      const input = createListMissionsInput();
      const result = await listGuestMissions(input, getClient);

      expect(result.missoes[0].titulo).toBe("Missão sem pack");
    });

    it("deve liberar client após execução", async () => {
      mockListChallenges.mockResolvedValue([]);
      mockPackDoEvento.mockResolvedValue(null);

      const input = createListMissionsInput();
      await listGuestMissions(input, getClient);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
