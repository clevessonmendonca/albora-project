/**
 * Contract Tests: Feed Schemas → Feed Use Cases
 * 
 * Valida que os schemas Zod de feed estão corretos e que seu output é aceito pelos use cases.
 */

import { describe, it, expect } from "vitest";
import { listFeedSchema } from "./feed-schemas";

describe("listFeedSchema → listFeed Contract", () => {
  describe("✅ Validação de Input Correto", () => {
    it("deve validar query vazia (sem filtros)", () => {
      const input = {};

      const validated = listFeedSchema.parse(input);

      // missao tem transform que converte undefined em null
      expect(validated.missao).toBe(null);
      // cursor não tem transform, permanece undefined
      expect(validated.cursor).toBeUndefined();
    });

    it("deve validar com missão válida", () => {
      const input = {
        missao: "123e4567-e89b-12d3-a456-426614174000",
      };

      const validated = listFeedSchema.parse(input);

      expect(validated.missao).toBe(input.missao);
    });

    it("deve validar com cursor", () => {
      const input = {
        cursor: "eyJpZCI6MTIzfQ==",
      };

      const validated = listFeedSchema.parse(input);

      expect(validated.cursor).toBe(input.cursor);
      // missao ausente vira null devido ao transform
      expect(validated.missao).toBe(null);
    });

    it("deve validar com missão e cursor", () => {
      const input = {
        missao: "123e4567-e89b-12d3-a456-426614174000",
        cursor: "eyJpZCI6MTIzfQ==",
      };

      const validated = listFeedSchema.parse(input);

      expect(validated.missao).toBe(input.missao);
      expect(validated.cursor).toBe(input.cursor);
    });

    it("deve transformar missão null em null", () => {
      const input = {
        missao: null,
      };

      const validated = listFeedSchema.parse(input);

      expect(validated.missao).toBe(null);
    });
  });

  describe("❌ Rejeição de Input Inválido", () => {
    it("deve rejeitar missão com UUID inválido", () => {
      const input = {
        missao: "not-a-uuid",
      };

      expect(() => listFeedSchema.parse(input)).toThrow(/ID de missão inválido/i);
    });

    it("deve rejeitar missão com formato parcial", () => {
      const input = {
        missao: "123e4567",
      };

      expect(() => listFeedSchema.parse(input)).toThrow(/ID de missão inválido/i);
    });
  });

  describe("🔄 Compatibilidade com Use Case", () => {
    it("deve produzir output compatível com listFeed use case", () => {
      const input = {
        missao: "123e4567-e89b-12d3-a456-426614174000",
        cursor: "eyJpZCI6MTIzfQ==",
      };

      const validated = listFeedSchema.parse(input);

      // O use case espera esses campos
      expect(validated).toHaveProperty("missao");
      expect(validated).toHaveProperty("cursor");

      // Tipos corretos
      expect(typeof validated.missao).toBe("string");
      expect(typeof validated.cursor).toBe("string");
    });

    it("deve aceitar filtro apenas por missão", () => {
      const input = {
        missao: "123e4567-e89b-12d3-a456-426614174000",
      };

      const validated = listFeedSchema.parse(input);

      expect(validated.missao).toBe(input.missao);
      expect(validated.cursor).toBeUndefined();
    });

    it("deve aceitar cursor para paginação sem filtro de missão", () => {
      const input = {
        cursor: "eyJpZCI6MTIzfQ==",
      };

      const validated = listFeedSchema.parse(input);

      // missao ausente vira null devido ao transform
      expect(validated.missao).toBe(null);
      expect(validated.cursor).toBe(input.cursor);
    });
  });
});
