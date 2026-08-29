/**
 * Testes dos Use Cases: Comments (list, publish, delete)
 * 
 * Sistema de comentários nas fotos do feed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listComments,
  type ListCommentsInput,
} from "./list-comments";
import {
  publishCommentUseCase,
  type PublishCommentInput,
} from "./publish-comment";
import {
  deleteComment,
  type DeleteCommentInput,
} from "./delete-comment";
import type { PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockEventGate,
  mockListarComentariosVisiveisDaFoto,
  mockBuildCommentThread,
  mockInteractionOpen,
  mockValidateCommentText,
  mockPublishComment,
  mockGravarComentario,
  mockRemoverComentario,
  mockClassifyCommentAfter,
  ErroComentarioDeOutroEvento,
} = vi.hoisted(() => {
  class ErroComentarioDeOutroEventoMock extends Error {
    constructor() {
      super("Comentário de outro evento");
      this.name = "ErroComentarioDeOutroEvento";
    }
  }

  return {
    mockWithEvent: vi.fn(),
    mockEventGate: vi.fn(),
    mockListarComentariosVisiveisDaFoto: vi.fn(),
    mockBuildCommentThread: vi.fn(),
    mockInteractionOpen: vi.fn(),
    mockValidateCommentText: vi.fn(),
    mockPublishComment: vi.fn(),
    mockGravarComentario: vi.fn(),
    mockRemoverComentario: vi.fn(),
    mockClassifyCommentAfter: vi.fn(),
    ErroComentarioDeOutroEvento: ErroComentarioDeOutroEventoMock,
  };
});

// Configuração de mocks
vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  eventGate: mockEventGate,
  listarComentariosVisiveisDaFoto: mockListarComentariosVisiveisDaFoto,
  gravarComentario: mockGravarComentario,
  removerComentario: mockRemoverComentario,
  ErroComentarioDeOutroEvento,
}));

vi.mock("@albora/core", () => ({
  buildCommentThread: mockBuildCommentThread,
  interactionOpen: mockInteractionOpen,
  validateCommentText: mockValidateCommentText,
  publishComment: mockPublishComment,
}));

vi.mock("@/lib/classify-comment", () => ({
  classifyCommentAfter: mockClassifyCommentAfter,
}));

// Helper para criar mock de PoolClient
function createMockClient(): PoolClient {
  return {
    query: vi.fn(),
    release: vi.fn(),
  } as unknown as PoolClient;
}

describe("Comments", () => {
  let mockClient: PoolClient;
  let getClient: () => Promise<PoolClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    getClient = vi.fn().mockResolvedValue(mockClient);

    // Defaults
    mockWithEvent.mockImplementation(async (_client, _eventId, fn) => fn(mockClient));
    mockEventGate.mockResolvedValue({ visible: true, interactionStartsAt: null });
    mockInteractionOpen.mockReturnValue(true);
    mockValidateCommentText.mockReturnValue("comentario.ok");
  });

  describe("listComments", () => {
    const createListInput = (overrides?: Partial<ListCommentsInput>): ListCommentsInput => ({
      eventoId: "evt-123",
      uploadId: "upl-456",
      currentSessionId: "sess-789",
      ...overrides,
    });

    it("deve listar comentários com sucesso", async () => {
      const comentariosDb = [
        {
          id: "cmt-1",
          autor: "João",
          texto: "Que foto linda!",
          respostaA: null,
          criadoEm: new Date("2026-08-28T20:00:00Z"),
          sessaoId: "sess-1",
        },
        {
          id: "cmt-2",
          autor: "Maria",
          texto: "Obrigada!",
          respostaA: "cmt-1",
          criadoEm: new Date("2026-08-28T20:05:00Z"),
          sessaoId: "sess-789",
        },
      ];

      mockListarComentariosVisiveisDaFoto.mockResolvedValue(comentariosDb);
      mockBuildCommentThread.mockReturnValue(comentariosDb);

      const input = createListInput();
      const result = await listComments(input, getClient);

      expect(result.comentarios).toHaveLength(2);
      expect(result.comentarios[0]).toEqual({
        id: "cmt-1",
        autor: "João",
        texto: "Que foto linda!",
        respostaA: null,
        criadaEm: "2026-08-28T20:00:00.000Z",
        meu: false,
        sessaoAutor: "sess-1",
      });
      expect(result.comentarios[1]).toEqual({
        id: "cmt-2",
        autor: "Maria",
        texto: "Obrigada!",
        respostaA: "cmt-1",
        criadaEm: "2026-08-28T20:05:00.000Z",
        meu: true,
        sessaoAutor: "sess-789",
      });
    });

    it("deve retornar array vazio quando não há comentários", async () => {
      mockListarComentariosVisiveisDaFoto.mockResolvedValue([]);
      mockBuildCommentThread.mockReturnValue([]);

      const input = createListInput();
      const result = await listComments(input, getClient);

      expect(result.comentarios).toEqual([]);
    });

    it("deve organizar comentários em thread", async () => {
      const comentariosDb = [
        {
          id: "cmt-2",
          autor: "B",
          texto: "Resposta",
          respostaA: "cmt-1",
          criadoEm: new Date("2026-08-28T20:05:00Z"),
          sessaoId: "sess-2",
        },
        {
          id: "cmt-1",
          autor: "A",
          texto: "Inicial",
          respostaA: null,
          criadoEm: new Date("2026-08-28T20:00:00Z"),
          sessaoId: "sess-1",
        },
        {
          id: "cmt-3",
          autor: "C",
          texto: "Outra resposta",
          respostaA: "cmt-1",
          criadoEm: new Date("2026-08-28T20:10:00Z"),
          sessaoId: "sess-3",
        },
      ];

      const comentariosOrdenados = [
        {
          id: "cmt-1",
          autor: "A",
          texto: "Inicial",
          respostaA: null,
          criadoEm: new Date("2026-08-28T20:00:00Z"),
          sessaoId: "sess-1",
        },
        {
          id: "cmt-2",
          autor: "B",
          texto: "Resposta",
          respostaA: "cmt-1",
          criadoEm: new Date("2026-08-28T20:05:00Z"),
          sessaoId: "sess-2",
        },
        {
          id: "cmt-3",
          autor: "C",
          texto: "Outra resposta",
          respostaA: "cmt-1",
          criadoEm: new Date("2026-08-28T20:10:00Z"),
          sessaoId: "sess-3",
        },
      ];

      mockListarComentariosVisiveisDaFoto.mockResolvedValue(comentariosDb);
      mockBuildCommentThread.mockReturnValue(comentariosOrdenados);

      const input = createListInput();
      await listComments(input, getClient);

      expect(mockBuildCommentThread).toHaveBeenCalledWith(comentariosDb);
    });

    it("deve marcar comentários da sessão atual como 'meu'", async () => {
      mockListarComentariosVisiveisDaFoto.mockResolvedValue([
        {
          id: "cmt-1",
          autor: "Eu",
          texto: "Meu comentário",
          respostaA: null,
          criadoEm: new Date(),
          sessaoId: "sess-current",
        },
      ]);
      mockBuildCommentThread.mockImplementation((c) => c);

      const input = createListInput({ currentSessionId: "sess-current" });
      const result = await listComments(input, getClient);

      expect(result.comentarios[0].meu).toBe(true);
    });

    it("deve liberar client após execução", async () => {
      mockListarComentariosVisiveisDaFoto.mockResolvedValue([]);
      mockBuildCommentThread.mockReturnValue([]);

      const input = createListInput();
      await listComments(input, getClient);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("publishCommentUseCase", () => {
    const createPublishInput = (
      overrides?: Partial<PublishCommentInput>,
    ): PublishCommentInput => ({
      eventoId: "evt-123",
      sessaoId: "sess-456",
      uploadId: "upl-789",
      texto: "Que foto incrível!",
      respostaA: null,
      ...overrides,
    });

    it("deve publicar comentário com sucesso", async () => {
      const comentarioGravado = {
        id: "cmt-new",
        autor: "João",
        texto: "Que foto incrível!",
        criadoEm: new Date(),
      };

      mockPublishComment.mockResolvedValue({
        ok: true,
        comentario: comentarioGravado,
      });

      const input = createPublishInput();
      const result = await publishCommentUseCase(input, getClient);

      expect(result).toEqual({
        ok: true,
        comentario: comentarioGravado,
      });

      expect(mockClassifyCommentAfter).toHaveBeenCalledWith(
        "evt-123",
        "cmt-new",
        "Que foto incrível!",
      );
    });

    it("deve validar que gate de interação está aberto", async () => {
      mockInteractionOpen.mockReturnValue(false);

      const input = createPublishInput();
      const result = await publishCommentUseCase(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "comentario.gate_fechado",
        message: "Comentários ainda não estão liberados",
      });

      expect(mockPublishComment).not.toHaveBeenCalled();
    });

    it("deve validar que gate existe", async () => {
      mockEventGate.mockResolvedValue(null);

      const input = createPublishInput();
      const result = await publishCommentUseCase(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "comentario.gate_fechado",
        message: "Comentários ainda não estão liberados",
      });
    });

    it("deve validar texto vazio", async () => {
      mockValidateCommentText.mockReturnValue("comentario.vazio");

      const input = createPublishInput({ texto: "" });
      const result = await publishCommentUseCase(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "comentario.vazio",
        message: "Texto do comentário inválido",
      });

      expect(mockPublishComment).not.toHaveBeenCalled();
    });

    it("deve validar texto muito longo", async () => {
      mockValidateCommentText.mockReturnValue("comentario.muito_longo");

      const input = createPublishInput({ texto: "a".repeat(1001) });
      const result = await publishCommentUseCase(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "comentario.muito_longo",
        message: "Texto do comentário inválido",
      });
    });

    it("deve falhar se upload não existe", async () => {
      mockPublishComment.mockResolvedValue({
        ok: false,
        code: "comentario.upload_ausente",
      });

      const input = createPublishInput({ uploadId: "upl-inexistente" });
      const result = await publishCommentUseCase(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "comentario.upload_ausente",
        message: "Falha ao publicar comentário",
      });
    });

    it("deve falhar se comentário pai não existe (resposta)", async () => {
      mockPublishComment.mockResolvedValue({
        ok: false,
        code: "comentario.pai_ausente",
      });

      const input = createPublishInput({ respostaA: "cmt-inexistente" });
      const result = await publishCommentUseCase(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "comentario.pai_ausente",
        message: "Falha ao publicar comentário",
      });
    });

    it("deve aceitar commentId customizado", async () => {
      mockPublishComment.mockResolvedValue({
        ok: true,
        comentario: { id: "cmt-custom" },
      });

      const input = createPublishInput({ commentId: "cmt-custom" });
      await publishCommentUseCase(input, getClient);

      expect(mockPublishComment).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cmt-custom" }),
        expect.any(Function),
      );
    });

    it("deve liberar client mesmo em caso de erro", async () => {
      mockInteractionOpen.mockReturnValue(false);

      const input = createPublishInput();
      await publishCommentUseCase(input, getClient);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("deleteComment", () => {
    const createDeleteInput = (
      overrides?: Partial<DeleteCommentInput>,
    ): DeleteCommentInput => ({
      eventoId: "evt-123",
      sessaoId: "sess-456",
      comentarioId: "cmt-789",
      ...overrides,
    });

    it("deve remover comentário com sucesso", async () => {
      mockRemoverComentario.mockResolvedValue(undefined);

      const input = createDeleteInput();
      const result = await deleteComment(input, getClient);

      expect(result).toEqual({ ok: true });

      expect(mockRemoverComentario).toHaveBeenCalledWith(
        mockClient,
        "cmt-789",
        "sess-456",
      );
    });

    it("deve validar que comentário pertence ao evento", async () => {
      mockWithEvent.mockRejectedValue(new ErroComentarioDeOutroEvento());

      const input = createDeleteInput();
      const result = await deleteComment(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "comentario.outro_evento",
        message: "Comentário não pertence a este evento",
      });
    });

    it("deve validar ownership (comentário de outra sessão)", async () => {
      mockRemoverComentario.mockRejectedValue(new Error("Not found"));

      const input = createDeleteInput();
      const result = await deleteComment(input, getClient);

      expect(result).toEqual({
        ok: false,
        code: "comentario.remocao_falhou",
        message: "Não foi possível remover o comentário",
      });
    });

    it("deve ser idempotente (comentário já removido)", async () => {
      mockRemoverComentario.mockRejectedValue(new Error("Comment not found"));

      const input = createDeleteInput();
      const result = await deleteComment(input, getClient);

      expect(result.ok).toBe(false);
    });

    it("deve liberar client mesmo em caso de erro", async () => {
      mockWithEvent.mockRejectedValue(new ErroComentarioDeOutroEvento());

      const input = createDeleteInput();
      await deleteComment(input, getClient);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("Fluxo completo: publish → list → delete", () => {
    it("deve completar ciclo de vida do comentário", async () => {
      // 1. Publicar comentário
      mockPublishComment.mockResolvedValue({
        ok: true,
        comentario: {
          id: "cmt-flow",
          autor: "João",
          texto: "Comentário de teste",
          criadoEm: new Date(),
        },
      });

      const publishInput = {
        eventoId: "evt-flow",
        sessaoId: "sess-flow",
        uploadId: "upl-flow",
        texto: "Comentário de teste",
        respostaA: null,
      };
      const publishResult = await publishCommentUseCase(publishInput, getClient);

      expect(publishResult.ok).toBe(true);

      // 2. Listar comentários
      mockListarComentariosVisiveisDaFoto.mockResolvedValue([
        {
          id: "cmt-flow",
          autor: "João",
          texto: "Comentário de teste",
          respostaA: null,
          criadoEm: new Date(),
          sessaoId: "sess-flow",
        },
      ]);
      mockBuildCommentThread.mockImplementation((c) => c);

      const listInput = {
        eventoId: "evt-flow",
        uploadId: "upl-flow",
        currentSessionId: "sess-flow",
      };
      const listResult = await listComments(listInput, getClient);

      expect(listResult.comentarios).toHaveLength(1);
      expect(listResult.comentarios[0].texto).toBe("Comentário de teste");

      // 3. Remover comentário
      mockRemoverComentario.mockResolvedValue(undefined);

      const deleteInput = {
        eventoId: "evt-flow",
        sessaoId: "sess-flow",
        comentarioId: "cmt-flow",
      };
      const deleteResult = await deleteComment(deleteInput, getClient);

      expect(deleteResult).toEqual({ ok: true });
    });
  });
});
