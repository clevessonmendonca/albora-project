/**
 * Contract Tests: Cover Image Schemas → Cover Image Use Cases
 */

import { describe, it, expect } from "vitest";
import { presignCoverImageSchema, confirmCoverImageSchema } from "./cover-image-schemas";

describe("Cover Image Schemas Contracts", () => {
  describe("presignCoverImageSchema", () => {
    it("deve validar mime e bytes", () => {
      const input = { mime: "image/jpeg", bytes: 1024000 };
      const validated = presignCoverImageSchema.parse(input);
      expect(validated.mime).toBe("image/jpeg");
      expect(validated.bytes).toBe(1024000);
    });

    it("deve rejeitar bytes zero", () => {
      const input = { mime: "image/jpeg", bytes: 0 };
      expect(() => presignCoverImageSchema.parse(input)).toThrow(/Tamanho inválido/i);
    });

    it("deve rejeitar mime vazio", () => {
      const input = { mime: "", bytes: 1024000 };
      expect(() => presignCoverImageSchema.parse(input)).toThrow(/MIME type obrigatório/i);
    });
  });

  describe("confirmCoverImageSchema", () => {
    it("deve validar chave e mime", () => {
      const input = { chave: "events/evt_123/cover.jpg", mime: "image/jpeg" };
      const validated = confirmCoverImageSchema.parse(input);
      expect(validated.chave).toBe(input.chave);
      expect(validated.mime).toBe(input.mime);
    });

    it("deve rejeitar chave vazia", () => {
      const input = { chave: "", mime: "image/jpeg" };
      expect(() => confirmCoverImageSchema.parse(input)).toThrow(/Chave obrigatória/i);
    });
  });
});
