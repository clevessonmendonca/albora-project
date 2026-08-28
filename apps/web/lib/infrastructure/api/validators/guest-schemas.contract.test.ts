/**
 * Contract Tests: Guest Schemas → Guest Session Use Cases
 * 
 * Valida que os schemas Zod de sessões de convidados estão corretos e que seu output é aceito pelos use cases.
 */

import { describe, it, expect } from "vitest";
import { updateSessionNameSchema } from "./guest-schemas";

describe("updateSessionNameSchema → updateSessionName Contract", () => {
  describe("✅ Validação de Input Correto", () => {
    it("deve validar ação 'ocultar' sem nome", () => {
      const input = {
        sessaoId: "550e8400-e29b-41d4-a716-446655440000",
        acao: "ocultar" as const,
      };

      const validated = updateSessionNameSchema.parse(input);

      expect(validated.sessaoId).toBe(input.sessaoId);
      expect(validated.acao).toBe("ocultar");
      expect(validated.nome).toBeUndefined();
    });

    it("deve validar ação 'renomear' com nome", () => {
      const input = {
        sessaoId: "550e8400-e29b-41d4-a716-446655440000",
        acao: "renomear" as const,
        nome: "Marina Silva",
      };

      const validated = updateSessionNameSchema.parse(input);

      expect(validated.sessaoId).toBe(input.sessaoId);
      expect(validated.acao).toBe("renomear");
      expect(validated.nome).toBe("Marina Silva");
    });

    it("deve aceitar 'ocultar' com nome opcional", () => {
      const input = {
        sessaoId: "550e8400-e29b-41d4-a716-446655440000",
        acao: "ocultar" as const,
        nome: "Nome ignorado",
      };

      const validated = updateSessionNameSchema.parse(input);

      expect(validated.sessaoId).toBe(input.sessaoId);
      expect(validated.acao).toBe("ocultar");
      expect(validated.nome).toBe("Nome ignorado");
    });
  });

  describe("❌ Rejeição de Input Inválido", () => {
    it("deve rejeitar sessaoId inválido", () => {
      const input = {
        sessaoId: "not-a-uuid",
        acao: "ocultar" as const,
      };

      expect(() => updateSessionNameSchema.parse(input)).toThrow(
        /ID de sessão inválido/i
      );
    });

    it("deve rejeitar ação inválida", () => {
      const input = {
        sessaoId: "550e8400-e29b-41d4-a716-446655440000",
        acao: "deletar",
      };

      // Zod retorna mensagem padrão de enum inválido
      expect(() => updateSessionNameSchema.parse(input)).toThrow(/Invalid option|ocultar.*renomear/i);
    });

    it("deve rejeitar sessaoId ausente", () => {
      const input = {
        acao: "ocultar" as const,
      };

      expect(() => updateSessionNameSchema.parse(input)).toThrow();
    });

    it("deve rejeitar acao ausente", () => {
      const input = {
        sessaoId: "550e8400-e29b-41d4-a716-446655440000",
      };

      expect(() => updateSessionNameSchema.parse(input)).toThrow();
    });
  });

  describe("🔄 Compatibilidade com Use Case", () => {
    it("deve produzir output compatível com updateSessionName use case", () => {
      const input = {
        sessaoId: "550e8400-e29b-41d4-a716-446655440000",
        acao: "renomear" as const,
        nome: "João Pedro",
      };

      const validated = updateSessionNameSchema.parse(input);

      expect(validated).toHaveProperty("sessaoId");
      expect(validated).toHaveProperty("acao");
      expect(validated).toHaveProperty("nome");
      expect(typeof validated.sessaoId).toBe("string");
      expect(typeof validated.acao).toBe("string");
      expect(typeof validated.nome).toBe("string");
    });

    it("deve aceitar apenas os dois valores de ação permitidos", () => {
      const acoes = ["ocultar", "renomear"] as const;

      acoes.forEach((acao) => {
        const input = {
          sessaoId: "550e8400-e29b-41d4-a716-446655440000",
          acao,
        };

        const validated = updateSessionNameSchema.parse(input);

        expect(validated.acao).toBe(acao);
      });
    });
  });
});
