/**
 * Testes dos Use Cases: Reactions (add, remove, list)
 * 
 * Sistema de reações nas fotos do feed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addReaction,
  type AddReactionInput,
  type AddReactionResult,
} from "./add-reaction";
import {
  removeReaction,
  type RemoveReactionInput,
  type RemoveReactionResult,
} from "./remove-reaction";
import {
  listReactions,
  type ListReactionsInput,
  type ListReactionsOutput,
} from "./list-reactions";
import type { PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockEventGate,
  mockEventPack,
  mockMidiaPublicadaDoEvento,
  mockGravarReacao,
  mockReacaoDaSessao,
  mockApagarReacao,
  mockListReactionsForMedia,
  mockIsValidReaction,
} = vi.hoisted(() => ({
  mockWithEvent: vi.fn(),
  mockEventGate: vi.fn(),
  mockEventPack: vi.fn(),
  mockMidiaPublicadaDoEvento: vi.fn(),
  mockGravarReacao: vi.fn(),
  mockReacaoDaSessao: vi.fn(),
  mockApagarReacao: vi.fn(),
  mockListReactionsForMedia: vi.fn(),
  mockIsValidReaction: vi.fn(),
}));

// Configuração de mocks
vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  eventGate: mockEventGate,
  eventPack: mockEventPack,
  midiaPublicadaDoEvento: mockMidiaPublicadaDoEvento,
  gravarReacao: mockGravarReacao,
  reacaoDaSessao: mockReacaoDaSessao,
  apagarReacao: mockApagarReacao,
  listReactionsForMedia: mockListReactionsForMedia,
}));

vi.mock("@albora/packs", () => ({
  isValidReaction: mockIsValidReaction,
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

describe("Reactions", () => {
  let mockClient: PoolClient;
  let getClient: () => Promise<PoolClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    getClient = vi.fn().mockResolvedValue(mockClient);

    // Defaults
    mockEventGate.mockResolvedValue({ visible: true });
    mockEventPack.mockResolvedValue("wedding");
    mockMidiaPublicadaDoEvento.mockResolvedValue(true);
    mockIsValidReaction.mockReturnValue(true);
    mockWithEvent.mockImplementation(async (_client, _eventId, fn) => fn(mockClient));
  });

  describe("addReaction", () => {
    const createAddInput = (overrides?: Partial<AddReactionInput>): AddReactionInput => ({
      eventoId: "evt-123",
      sessaoId: "sess-456",
      uploadId: "upl-789",
      tipo: "curtir",
      ...overrides,
    });

    it("deve adicionar reação com sucesso", async () => {
      mockGravarReacao.mockResolvedValue(5);

      const input = createAddInput();
      const result = await addReaction(input, getClient);

      expect(result).toEqual({
        ok: true,
        reacoes: 5,
        minha: "curtir",
      });

      expect(mockGravarReacao).toHaveBeenCalledWith(
        mockClient,
        "evt-123",
        "upl-789",
        "sess-456",
        "curtir",
      );
    });

    it("deve validar que evento existe e está visível", async () => {
      mockEventGate.mockResolvedValue(null);

      const input = createAddInput();
      const result = await addReaction(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "reacao.evento_ausente",
      });

      expect(mockGravarReacao).not.toHaveBeenCalled();
    });

    it("deve validar que mídia pertence ao evento", async () => {
      mockMidiaPublicadaDoEvento.mockResolvedValue(false);

      const input = createAddInput();
      const result = await addReaction(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "reacao.midia_ausente",
      });

      expect(mockGravarReacao).not.toHaveBeenCalled();
    });

    it("deve validar tipo de reação para o pack", async () => {
      mockIsValidReaction.mockReturnValue(false);

      const input = createAddInput({ tipo: "tipo_invalido" });
      const result = await addReaction(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "reacao.tipo_invalido",
      });

      expect(mockGravarReacao).not.toHaveBeenCalled();
    });

    it("deve substituir reação anterior da mesma sessão", async () => {
      // Primeira reação
      mockGravarReacao.mockResolvedValueOnce(1);
      const input1 = createAddInput({ tipo: "curtir" });
      const result1 = await addReaction(input1, getClient);

      expect(result1).toEqual({
        ok: true,
        reacoes: 1,
        minha: "curtir",
      });

      // Segunda reação (substitui)
      mockGravarReacao.mockResolvedValueOnce(1);
      const input2 = createAddInput({ tipo: "amar" });
      const result2 = await addReaction(input2, getClient);

      expect(result2).toEqual({
        ok: true,
        reacoes: 1,
        minha: "amar",
      });
    });

    it("deve aceitar todos os tipos válidos de reação", async () => {
      const tiposValidos = ["curtir", "amar", "rir", "chorar", "aplaudir"];

      for (const tipo of tiposValidos) {
        mockGravarReacao.mockResolvedValue(1);
        const input = createAddInput({ tipo });
        const result = await addReaction(input, getClient);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.minha).toBe(tipo);
        }
      }
    });

    it("deve liberar client mesmo em caso de erro", async () => {
      mockEventGate.mockResolvedValue(null);

      const input = createAddInput();
      await addReaction(input, getClient);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("removeReaction", () => {
    const createRemoveInput = (
      overrides?: Partial<RemoveReactionInput>,
    ): RemoveReactionInput => ({
      eventoId: "evt-123",
      sessaoId: "sess-456",
      uploadId: "upl-789",
      ...overrides,
    });

    it("deve remover reação com sucesso", async () => {
      mockReacaoDaSessao.mockResolvedValue({ tipo: "curtir" });
      mockApagarReacao.mockResolvedValue(4);

      const input = createRemoveInput();
      const result = await removeReaction(input, getClient);

      expect(result).toEqual({
        ok: true,
        reacoes: 4,
        minha: null,
      });

      expect(mockApagarReacao).toHaveBeenCalledWith(
        mockClient,
        "upl-789",
        "sess-456",
      );
    });

    it("deve validar que evento existe e está visível", async () => {
      mockEventGate.mockResolvedValue(null);

      const input = createRemoveInput();
      const result = await removeReaction(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "reacao.evento_ausente",
      });

      expect(mockApagarReacao).not.toHaveBeenCalled();
    });

    it("deve ser idempotente quando não há reação", async () => {
      mockReacaoDaSessao.mockResolvedValue(null);
      (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ total: 3 }],
      });

      const input = createRemoveInput();
      const result = await removeReaction(input, getClient);

      expect(result).toEqual({
        ok: true,
        reacoes: 3,
        minha: null,
      });

      expect(mockApagarReacao).not.toHaveBeenCalled();
    });

    it("deve retornar zero quando não há reações na foto", async () => {
      mockReacaoDaSessao.mockResolvedValue(null);
      (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{ total: 0 }],
      });

      const input = createRemoveInput();
      const result = await removeReaction(input, getClient);

      expect(result).toEqual({
        ok: true,
        reacoes: 0,
        minha: null,
      });
    });

    it("deve liberar client mesmo em caso de erro", async () => {
      mockEventGate.mockResolvedValue(null);

      const input = createRemoveInput();
      await removeReaction(input, getClient);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("listReactions", () => {
    const createListInput = (
      overrides?: Partial<ListReactionsInput>,
    ): ListReactionsInput => ({
      eventoId: "evt-123",
      sessaoId: "sess-456",
      uploadId: "upl-789",
      ...overrides,
    });

    it("deve listar reatores com sucesso", async () => {
      mockListReactionsForMedia.mockResolvedValue([
        { nome: "João", sessaoId: "sess-1" },
        { nome: "Maria", sessaoId: "sess-2" },
        { nome: "Pedro", sessaoId: "sess-3" },
      ]);

      const input = createListInput();
      const result = await listReactions(input, getClient);

      expect(result).toEqual({
        reatores: [
          { nome: "João", sessaoId: "sess-1" },
          { nome: "Maria", sessaoId: "sess-2" },
          { nome: "Pedro", sessaoId: "sess-3" },
        ],
      });
    });

    it("deve retornar array vazio quando não há reações", async () => {
      mockListReactionsForMedia.mockResolvedValue([]);

      const input = createListInput();
      const result = await listReactions(input, getClient);

      expect(result).toEqual({
        reatores: [],
      });
    });

    it("deve incluir própria sessão na lista", async () => {
      mockListReactionsForMedia.mockResolvedValue([
        { nome: "Você", sessaoId: "sess-456" },
        { nome: "Outro", sessaoId: "sess-789" },
      ]);

      const input = createListInput({ sessaoId: "sess-456" });
      const result = await listReactions(input, getClient);

      expect(result.reatores).toHaveLength(2);
      expect(result.reatores[0].sessaoId).toBe("sess-456");
    });

    it("deve liberar client após execução", async () => {
      mockListReactionsForMedia.mockResolvedValue([]);

      const input = createListInput();
      await listReactions(input, getClient);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("Fluxo completo: add → list → remove", () => {
    it("deve completar ciclo de vida da reação", async () => {
      // 1. Adicionar reação
      mockGravarReacao.mockResolvedValue(1);
      const addInput = {
        eventoId: "evt-flow",
        sessaoId: "sess-flow",
        uploadId: "upl-flow",
        tipo: "curtir",
      };
      const addResult = await addReaction(addInput, getClient);

      expect(addResult).toEqual({
        ok: true,
        reacoes: 1,
        minha: "curtir",
      });

      // 2. Listar reações
      mockListReactionsForMedia.mockResolvedValue([
        { nome: "João", sessaoId: "sess-flow" },
      ]);

      const listInput = {
        eventoId: "evt-flow",
        sessaoId: "sess-flow",
        uploadId: "upl-flow",
      };
      const listResult = await listReactions(listInput, getClient);

      expect(listResult.reatores).toHaveLength(1);
      expect(listResult.reatores[0].nome).toBe("João");

      // 3. Remover reação
      mockReacaoDaSessao.mockResolvedValue({ tipo: "curtir" });
      mockApagarReacao.mockResolvedValue(0);

      const removeInput = {
        eventoId: "evt-flow",
        sessaoId: "sess-flow",
        uploadId: "upl-flow",
      };
      const removeResult = await removeReaction(removeInput, getClient);

      expect(removeResult).toEqual({
        ok: true,
        reacoes: 0,
        minha: null,
      });
    });
  });
});
