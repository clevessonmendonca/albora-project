/**
 * Contract Tests: Wall Schemas → Wall Use Cases
 */

import { describe, it, expect } from "vitest";
import { authorizeWallSchema } from "./wall-schemas";

describe("authorizeWallSchema → authorizeWall Contract", () => {
  describe("✅ Validação de Input Correto", () => {
    it("deve validar código válido", () => {
      const input = { codigo: "ABC234" };
      const validated = authorizeWallSchema.parse(input);
      expect(validated.codigo).toBe("ABC234");
    });

    it("deve transformar para uppercase", () => {
      const input = { codigo: "abc234" };
      const validated = authorizeWallSchema.parse(input);
      expect(validated.codigo).toBe("ABC234");
    });

    it("deve trimar espaços", () => {
      const input = { codigo: "  ABC234  " };
      const validated = authorizeWallSchema.parse(input);
      expect(validated.codigo).toBe("ABC234");
    });

    it("deve aceitar código sem letras ambíguas", () => {
      const input = { codigo: "HJNPZ9" };
      const validated = authorizeWallSchema.parse(input);
      expect(validated.codigo).toBe("HJNPZ9");
    });
  });

  describe("❌ Rejeição de Input Inválido", () => {
    it("deve rejeitar código vazio", () => {
      const input = { codigo: "" };
      expect(() => authorizeWallSchema.parse(input)).toThrow(/Código obrigatório/i);
    });

    it("deve rejeitar código curto (< 6)", () => {
      const input = { codigo: "ABC22" };
      expect(() => authorizeWallSchema.parse(input)).toThrow(/Código inválido/i);
    });

    it("deve rejeitar código longo (> 6)", () => {
      const input = { codigo: "ABC2234" };
      expect(() => authorizeWallSchema.parse(input)).toThrow(/Código inválido/i);
    });

    it("deve rejeitar letras ambíguas (I, O, L)", () => {
      const input = { codigo: "ABCIOL" };
      expect(() => authorizeWallSchema.parse(input)).toThrow(/Código inválido/i);
    });

    it("deve rejeitar números ambíguos (0, 1)", () => {
      const input = { codigo: "ABC012" };
      expect(() => authorizeWallSchema.parse(input)).toThrow(/Código inválido/i);
    });
  });

  describe("🔄 Compatibilidade com Use Case", () => {
    it("deve produzir output compatível com authorizeWall use case", () => {
      const input = { codigo: "abc234" };
      const validated = authorizeWallSchema.parse(input);
      expect(validated).toHaveProperty("codigo");
      expect(typeof validated.codigo).toBe("string");
      expect(validated.codigo).toHaveLength(6);
    });
  });
});
