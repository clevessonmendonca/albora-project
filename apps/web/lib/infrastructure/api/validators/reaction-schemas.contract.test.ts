/**
 * Contract Tests: Reaction Schemas → Reaction Use Cases
 * 
 * Valida que os schemas Zod de reações estão corretos e que seu output é aceito pelos use cases.
 */

import { describe, it, expect } from "vitest";
import {
  listReactionsSchema,
  addReactionSchema,
  removeReactionSchema,
} from "./reaction-schemas";

describe("Reaction Schemas Contracts", () => {
  describe("listReactionsSchema → listReactions Contract", () => {
    describe("✅ Validação de Input Correto", () => {
      it("deve validar uploadId válido", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const validated = listReactionsSchema.parse(input);

        expect(validated.uploadId).toBe(input.uploadId);
      });
    });

    describe("❌ Rejeição de Input Inválido", () => {
      it("deve rejeitar uploadId inválido", () => {
        const input = {
          uploadId: "not-a-uuid",
        };

        expect(() => listReactionsSchema.parse(input)).toThrow(
          /ID de upload inválido/i
        );
      });

      it("deve rejeitar uploadId ausente", () => {
        const input = {};

        expect(() => listReactionsSchema.parse(input)).toThrow();
      });
    });

    describe("🔄 Compatibilidade com Use Case", () => {
      it("deve produzir output compatível com listReactions use case", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const validated = listReactionsSchema.parse(input);

        expect(validated).toHaveProperty("uploadId");
        expect(typeof validated.uploadId).toBe("string");
      });
    });
  });

  describe("addReactionSchema → addReaction Contract", () => {
    describe("✅ Validação de Input Correto", () => {
      it("deve validar reação com tipo válido", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          tipo: "like",
        };

        const validated = addReactionSchema.parse(input);

        expect(validated.uploadId).toBe(input.uploadId);
        expect(validated.tipo).toBe(input.tipo);
      });

      it("deve aceitar diferentes tipos de reação", () => {
        const tipos = ["like", "love", "haha", "wow", "sad", "angry"];

        tipos.forEach((tipo) => {
          const input = {
            uploadId: "550e8400-e29b-41d4-a716-446655440000",
            tipo,
          };

          const validated = addReactionSchema.parse(input);

          expect(validated.tipo).toBe(tipo);
        });
      });
    });

    describe("❌ Rejeição de Input Inválido", () => {
      it("deve rejeitar uploadId inválido", () => {
        const input = {
          uploadId: "not-a-uuid",
          tipo: "like",
        };

        expect(() => addReactionSchema.parse(input)).toThrow(
          /ID de upload inválido/i
        );
      });

      it("deve rejeitar tipo vazio", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          tipo: "",
        };

        expect(() => addReactionSchema.parse(input)).toThrow(
          /Tipo de reação obrigatório/i
        );
      });

      it("deve rejeitar tipo ausente", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
        };

        expect(() => addReactionSchema.parse(input)).toThrow();
      });

      it("deve rejeitar uploadId ausente", () => {
        const input = {
          tipo: "like",
        };

        expect(() => addReactionSchema.parse(input)).toThrow();
      });
    });

    describe("🔄 Compatibilidade com Use Case", () => {
      it("deve produzir output compatível com addReaction use case", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
          tipo: "like",
        };

        const validated = addReactionSchema.parse(input);

        expect(validated).toHaveProperty("uploadId");
        expect(validated).toHaveProperty("tipo");
        expect(typeof validated.uploadId).toBe("string");
        expect(typeof validated.tipo).toBe("string");
      });
    });
  });

  describe("removeReactionSchema → removeReaction Contract", () => {
    describe("✅ Validação de Input Correto", () => {
      it("deve validar uploadId válido", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const validated = removeReactionSchema.parse(input);

        expect(validated.uploadId).toBe(input.uploadId);
      });
    });

    describe("❌ Rejeição de Input Inválido", () => {
      it("deve rejeitar uploadId inválido", () => {
        const input = {
          uploadId: "not-a-uuid",
        };

        expect(() => removeReactionSchema.parse(input)).toThrow(
          /ID de upload inválido/i
        );
      });

      it("deve rejeitar uploadId ausente", () => {
        const input = {};

        expect(() => removeReactionSchema.parse(input)).toThrow();
      });
    });

    describe("🔄 Compatibilidade com Use Case", () => {
      it("deve produzir output compatível com removeReaction use case", () => {
        const input = {
          uploadId: "550e8400-e29b-41d4-a716-446655440000",
        };

        const validated = removeReactionSchema.parse(input);

        expect(validated).toHaveProperty("uploadId");
        expect(typeof validated.uploadId).toBe("string");
      });
    });
  });
});
