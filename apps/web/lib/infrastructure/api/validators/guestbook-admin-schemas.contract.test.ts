/**
 * Contract Tests: Guestbook Admin Schemas → Guestbook Use Cases
 */

import { describe, it, expect } from "vitest";
import { upsertGuestbookSchema } from "./guestbook-admin-schemas";

describe("upsertGuestbookSchema → upsertGuestbook Contract", () => {
  describe("✅ Validação de Input Correto", () => {
    it("deve validar texto simples", () => {
      const input = { texto: "Mensagem do casal" };
      const validated = upsertGuestbookSchema.parse(input);
      expect(validated.texto).toBe("Mensagem do casal");
    });

    it("deve validar com publicaEm válido", () => {
      const input = {
        texto: "Mensagem",
        publicaEm: "2024-12-25T18:00:00Z",
      };
      const validated = upsertGuestbookSchema.parse(input);
      expect(validated.publicaEm).toBeInstanceOf(Date);
    });

    it("deve transformar publicaEm null em null", () => {
      const input = { texto: "Mensagem", publicaEm: null };
      const validated = upsertGuestbookSchema.parse(input);
      expect(validated.publicaEm).toBe(null);
    });
  });

  describe("❌ Rejeição de Input Inválido", () => {
    it("deve rejeitar texto vazio", () => {
      const input = { texto: "" };
      expect(() => upsertGuestbookSchema.parse(input)).toThrow(/Texto obrigatório/i);
    });

    it("deve rejeitar publicaEm inválido", () => {
      const input = { texto: "Mensagem", publicaEm: "invalid-date" };
      expect(() => upsertGuestbookSchema.parse(input)).toThrow(/Horário inválido/i);
    });
  });
});
