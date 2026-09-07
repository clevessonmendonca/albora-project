/**
 * Contract Tests: Comment Schemas → Comment Use Cases
 * 
 * Valida que os schemas Zod de comentários estão corretos e que seu output é aceito pelos use cases.
 */

import { describe, it, expect } from "vitest";
import { publishCommentSchema, deleteCommentSchema } from "./comment-schemas";

describe("Comment Schemas Contracts", () => {
  describe("publishCommentSchema → publishComment Contract", () => {
    describe("✅ Validação de Input Correto", () => {
      it("deve validar comentário simples", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "Que foto linda!",
        };

        const validated = publishCommentSchema.parse(input);

        expect(validated.uploadId).toBe(input.uploadId);
        expect(validated.texto).toBe(input.texto);
      });

      it("deve validar comentário com resposta", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "Concordo!",
          respostaA: "123e4567-e89b-12d3-a456-426614174000",
        };

        const validated = publishCommentSchema.parse(input);

        expect(validated.uploadId).toBe(input.uploadId);
        expect(validated.texto).toBe(input.texto);
        expect(validated.respostaA).toBe(input.respostaA);
      });

      it("deve validar comentário com ID (edição/update)", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "Comentário editado",
          id: "abc12345-e89b-12d3-a456-426614174000",
        };

        const validated = publishCommentSchema.parse(input);

        expect(validated.uploadId).toBe(input.uploadId);
        expect(validated.texto).toBe(input.texto);
        expect(validated.id).toBe(input.id);
      });

      it("deve aceitar texto no limite mínimo (1 caractere)", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "A",
        };

        const validated = publishCommentSchema.parse(input);

        expect(validated.texto).toBe("A");
      });

      it("deve aceitar texto no limite máximo (500 caracteres)", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "A".repeat(500),
        };

        const validated = publishCommentSchema.parse(input);

        expect(validated.texto).toHaveLength(500);
      });

      it("deve aceitar respostaA como null", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "Comentário",
          respostaA: null,
        };

        const validated = publishCommentSchema.parse(input);

        expect(validated.respostaA).toBe(null);
      });
    });

    describe("❌ Rejeição de Input Inválido", () => {
      it("deve rejeitar uploadId inválido", () => {
        const input = {
          uploadId: "not-a-uuid",
          texto: "Comentário",
        };

        expect(() => publishCommentSchema.parse(input)).toThrow(
          /ID de upload inválido/i
        );
      });

      it("deve rejeitar texto vazio", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "",
        };

        expect(() => publishCommentSchema.parse(input)).toThrow(
          /Comentário não pode ser vazio/i
        );
      });

      it("deve rejeitar texto acima do limite (501 caracteres)", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "A".repeat(501),
        };

        expect(() => publishCommentSchema.parse(input)).toThrow(
          /Comentário muito longo/i
        );
      });

      it("deve rejeitar respostaA com UUID inválido", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "Resposta",
          respostaA: "not-a-uuid",
        };

        expect(() => publishCommentSchema.parse(input)).toThrow(
          /ID de comentário pai inválido/i
        );
      });

      it("deve rejeitar id com UUID inválido", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "Comentário",
          id: "not-a-uuid",
        };

        expect(() => publishCommentSchema.parse(input)).toThrow(
          /ID de comentário inválido/i
        );
      });

      it("deve rejeitar uploadId ausente", () => {
        const input = {
          texto: "Comentário",
        };

        expect(() => publishCommentSchema.parse(input)).toThrow();
      });

      it("deve rejeitar texto ausente", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
        };

        expect(() => publishCommentSchema.parse(input)).toThrow();
      });
    });

    describe("🔄 Compatibilidade com Use Case", () => {
      it("deve produzir output compatível com publishComment use case", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "Comentário de teste",
          respostaA: "123e4567-e89b-12d3-a456-426614174000",
        };

        const validated = publishCommentSchema.parse(input);

        expect(validated).toHaveProperty("uploadId");
        expect(validated).toHaveProperty("texto");
        expect(validated).toHaveProperty("respostaA");
        expect(typeof validated.uploadId).toBe("string");
        expect(typeof validated.texto).toBe("string");
        expect(typeof validated.respostaA).toBe("string");
      });

      it("deve incluir campos opcionais quando fornecidos", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          texto: "Comentário",
          id: "abc12345-e89b-12d3-a456-426614174000",
        };

        const validated = publishCommentSchema.parse(input);

        expect(validated.id).toBe(input.id);
      });
    });
  });

  describe("deleteCommentSchema → deleteComment Contract", () => {
    describe("✅ Validação de Input Correto", () => {
      it("deve validar comentarioId válido", () => {
        const input = {
          comentarioId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const validated = deleteCommentSchema.parse(input);

        expect(validated.comentarioId).toBe(input.comentarioId);
      });
    });

    describe("❌ Rejeição de Input Inválido", () => {
      it("deve rejeitar comentarioId inválido", () => {
        const input = {
          comentarioId: "not-a-uuid",
        };

        expect(() => deleteCommentSchema.parse(input)).toThrow(
          /ID de comentário inválido/i
        );
      });

      it("deve rejeitar comentarioId ausente", () => {
        const input = {};

        expect(() => deleteCommentSchema.parse(input)).toThrow();
      });
    });

    describe("🔄 Compatibilidade com Use Case", () => {
      it("deve produzir output compatível com deleteComment use case", () => {
        const input = {
          comentarioId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const validated = deleteCommentSchema.parse(input);

        expect(validated).toHaveProperty("comentarioId");
        expect(typeof validated.comentarioId).toBe("string");
      });
    });
  });
});
