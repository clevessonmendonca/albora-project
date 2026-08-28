/**
 * Contract Tests: App Pair Schemas → App Pairing Use Cases
 * 
 * Valida que os schemas Zod de pareamento de app nativo estão corretos e que seu output é aceito pelos use cases.
 */

import { describe, it, expect } from "vitest";
import { redeemAppPairSchema } from "./app-pair-schemas";

describe("redeemAppPairSchema → redeemAppPair Contract", () => {
  describe("✅ Validação de Input Correto", () => {
    it("deve validar código de 4 dígitos", () => {
      const input = {
        codigo: "1234",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.codigo).toBe("1234");
      expect(validated.passagem).toBeUndefined();
    });

    it("deve validar passagem válida", () => {
      const input = {
        passagem: "abc123_-DEF456xyz",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.passagem).toBe("abc123_-DEF456xyz");
      expect(validated.codigo).toBeUndefined();
    });

    it("deve validar código e passagem juntos", () => {
      const input = {
        codigo: "5678",
        passagem: "validToken123",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.codigo).toBe("5678");
      expect(validated.passagem).toBe("validToken123");
    });

    it("deve trimar código com espaços", () => {
      const input = {
        codigo: "  9876  ",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.codigo).toBe("9876");
    });

    it("deve trimar passagem com espaços", () => {
      const input = {
        passagem: "  tokenABC123  ",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.passagem).toBe("tokenABC123");
    });

    it("deve aceitar passagem no limite mínimo (8 caracteres)", () => {
      const input = {
        passagem: "abcd1234",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.passagem).toBe("abcd1234");
    });

    it("deve aceitar passagem no limite máximo (128 caracteres)", () => {
      const input = {
        passagem: "a".repeat(128),
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.passagem).toHaveLength(128);
    });

    it("deve aceitar passagem com caracteres especiais permitidos", () => {
      const input = {
        passagem: "abc_DEF-123",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.passagem).toBe("abc_DEF-123");
    });

    it("deve transformar código vazio em undefined", () => {
      const input = {
        codigo: "",
        passagem: "tokenABC",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.codigo).toBeUndefined();
      expect(validated.passagem).toBe("tokenABC");
    });

    it("deve transformar passagem vazia em undefined", () => {
      const input = {
        codigo: "1234",
        passagem: "",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.codigo).toBe("1234");
      expect(validated.passagem).toBeUndefined();
    });
  });

  describe("❌ Rejeição de Input Inválido", () => {
    it("deve rejeitar código com menos de 4 dígitos", () => {
      const input = {
        codigo: "123",
      };

      expect(() => redeemAppPairSchema.parse(input)).toThrow(
        /Código deve ter 4 dígitos/i
      );
    });

    it("deve rejeitar código com mais de 4 dígitos", () => {
      const input = {
        codigo: "12345",
      };

      expect(() => redeemAppPairSchema.parse(input)).toThrow(
        /Código deve ter 4 dígitos/i
      );
    });

    it("deve rejeitar código com letras", () => {
      const input = {
        codigo: "12AB",
      };

      expect(() => redeemAppPairSchema.parse(input)).toThrow(
        /Código deve ter 4 dígitos/i
      );
    });

    it("deve rejeitar passagem com menos de 8 caracteres", () => {
      const input = {
        passagem: "abc123",
      };

      expect(() => redeemAppPairSchema.parse(input)).toThrow(/Passagem inválida/i);
    });

    it("deve rejeitar passagem com mais de 128 caracteres", () => {
      const input = {
        passagem: "a".repeat(129),
      };

      expect(() => redeemAppPairSchema.parse(input)).toThrow(/Passagem inválida/i);
    });

    it("deve rejeitar passagem com caracteres especiais não permitidos", () => {
      const input = {
        passagem: "abc@123!456",
      };

      expect(() => redeemAppPairSchema.parse(input)).toThrow(/Passagem inválida/i);
    });

    it("deve rejeitar input sem código nem passagem", () => {
      const input = {};

      expect(() => redeemAppPairSchema.parse(input)).toThrow(
        /Informe código ou passagem/i
      );
    });

    it("deve rejeitar input com código e passagem vazios", () => {
      const input = {
        codigo: "",
        passagem: "",
      };

      expect(() => redeemAppPairSchema.parse(input)).toThrow(
        /Informe código ou passagem/i
      );
    });

    it("deve rejeitar input com código null e passagem ausente", () => {
      const input = {
        codigo: null,
      };

      expect(() => redeemAppPairSchema.parse(input)).toThrow(
        /Informe código ou passagem/i
      );
    });
  });

  describe("🔄 Compatibilidade com Use Case", () => {
    it("deve produzir output compatível com redeemAppPair use case (código)", () => {
      const input = {
        codigo: "1234",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated).toHaveProperty("codigo");
      expect(typeof validated.codigo).toBe("string");
    });

    it("deve produzir output compatível com redeemAppPair use case (passagem)", () => {
      const input = {
        passagem: "tokenABC123",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated).toHaveProperty("passagem");
      expect(typeof validated.passagem).toBe("string");
    });

    it("deve incluir ambos os campos quando fornecidos", () => {
      const input = {
        codigo: "5678",
        passagem: "tokenXYZ789",
      };

      const validated = redeemAppPairSchema.parse(input);

      expect(validated.codigo).toBe("5678");
      expect(validated.passagem).toBe("tokenXYZ789");
    });
  });
});
