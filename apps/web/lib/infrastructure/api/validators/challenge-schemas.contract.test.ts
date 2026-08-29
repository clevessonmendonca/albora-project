/**
 * Contract Tests: Challenge Schemas → Challenge Use Cases
 * 
 * Valida que os schemas Zod de desafios/missões estão corretos e que seu output é aceito pelos use cases.
 */

import { describe, it, expect } from "vitest";
import { updateChallengesSchema } from "./challenge-schemas";

describe("updateChallengesSchema → updateChallenges Contract", () => {
  describe("✅ Validação de Input Correto", () => {
    it("deve validar apenas titleKeys", () => {
      const input = {
        titleKeys: ["make_selfie", "couple_photo", "group_photo"],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.titleKeys).toEqual(input.titleKeys);
      expect(validated.customMissions).toBeUndefined();
    });

    it("deve validar apenas customMissions", () => {
      const input = {
        customMissions: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            titulo: "Foto com os padrinhos",
            posicao: 0,
            emoji: "🎉",
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.customMissions).toHaveLength(1);
      expect(validated.customMissions?.[0].titulo).toBe("Foto com os padrinhos");
      expect(validated.titleKeys).toBeUndefined();
    });

    it("deve validar titleKeys e customMissions juntos", () => {
      const input = {
        titleKeys: ["make_selfie"],
        customMissions: [
          {
            titulo: "Missão personalizada",
            posicao: 0,
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.titleKeys).toEqual(["make_selfie"]);
      expect(validated.customMissions).toHaveLength(1);
    });

    it("deve validar customMission sem ID (nova missão)", () => {
      const input = {
        customMissions: [
          {
            titulo: "Nova missão",
            posicao: 0,
            emoji: "📸",
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.customMissions?.[0].id).toBeUndefined();
      expect(validated.customMissions?.[0].titulo).toBe("Nova missão");
    });

    it("deve validar customMission sem emoji", () => {
      const input = {
        customMissions: [
          {
            titulo: "Missão sem emoji",
            posicao: 1,
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      // Schema transform retorna null quando emoji não é fornecido
      expect(validated.customMissions?.[0].emoji).toBe(null);
    });

    it("deve trimar título da missão", () => {
      const input = {
        customMissions: [
          {
            titulo: "  Título com espaços  ",
            posicao: 0,
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.customMissions?.[0].titulo).toBe("Título com espaços");
    });

    it("deve trimar emoji", () => {
      const input = {
        customMissions: [
          {
            titulo: "Missão",
            posicao: 0,
            emoji: "  🎉  ",
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.customMissions?.[0].emoji).toBe("🎉");
    });

    it("deve transformar emoji vazio em null", () => {
      const input = {
        customMissions: [
          {
            titulo: "Missão",
            posicao: 0,
            emoji: "   ",
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.customMissions?.[0].emoji).toBe(null);
    });

    it("deve validar múltiplas customMissions", () => {
      const input = {
        customMissions: [
          { titulo: "Missão 1", posicao: 0 },
          { titulo: "Missão 2", posicao: 1 },
          { titulo: "Missão 3", posicao: 2 },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.customMissions).toHaveLength(3);
      expect(validated.customMissions?.[0].posicao).toBe(0);
      expect(validated.customMissions?.[1].posicao).toBe(1);
      expect(validated.customMissions?.[2].posicao).toBe(2);
    });

    it("deve aceitar título no limite (120 caracteres)", () => {
      const input = {
        customMissions: [
          {
            titulo: "A".repeat(120),
            posicao: 0,
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated.customMissions?.[0].titulo).toHaveLength(120);
    });
  });

  describe("❌ Rejeição de Input Inválido", () => {
    it("deve rejeitar título vazio", () => {
      const input = {
        customMissions: [
          {
            titulo: "",
            posicao: 0,
          },
        ],
      };

      expect(() => updateChallengesSchema.parse(input)).toThrow(/Título obrigatório/i);
    });

    it("deve rejeitar título muito longo (>120 caracteres)", () => {
      const input = {
        customMissions: [
          {
            titulo: "A".repeat(121),
            posicao: 0,
          },
        ],
      };

      expect(() => updateChallengesSchema.parse(input)).toThrow(/Título muito longo/i);
    });

    it("deve rejeitar posição negativa", () => {
      const input = {
        customMissions: [
          {
            titulo: "Missão",
            posicao: -1,
          },
        ],
      };

      expect(() => updateChallengesSchema.parse(input)).toThrow(/Posição inválida/i);
    });

    it("deve rejeitar posição não inteira", () => {
      const input = {
        customMissions: [
          {
            titulo: "Missão",
            posicao: 1.5,
          },
        ],
      };

      expect(() => updateChallengesSchema.parse(input)).toThrow();
    });

    it("deve rejeitar ID inválido (não UUID)", () => {
      const input = {
        customMissions: [
          {
            id: "not-a-uuid",
            titulo: "Missão",
            posicao: 0,
          },
        ],
      };

      expect(() => updateChallengesSchema.parse(input)).toThrow();
    });

    it("deve rejeitar customMission sem título", () => {
      const input = {
        customMissions: [
          {
            posicao: 0,
          },
        ],
      };

      expect(() => updateChallengesSchema.parse(input)).toThrow();
    });

    it("deve rejeitar customMission sem posicao", () => {
      const input = {
        customMissions: [
          {
            titulo: "Missão",
          },
        ],
      };

      expect(() => updateChallengesSchema.parse(input)).toThrow();
    });
  });

  describe("🔄 Compatibilidade com Use Case", () => {
    it("deve produzir output compatível com updateChallenges use case", () => {
      const input = {
        titleKeys: ["make_selfie", "couple_photo"],
        customMissions: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            titulo: "Foto especial",
            posicao: 0,
            emoji: "📸",
          },
        ],
      };

      const validated = updateChallengesSchema.parse(input);

      expect(validated).toHaveProperty("titleKeys");
      expect(validated).toHaveProperty("customMissions");
      expect(Array.isArray(validated.titleKeys)).toBe(true);
      expect(Array.isArray(validated.customMissions)).toBe(true);

      const mission = validated.customMissions?.[0];
      expect(mission).toHaveProperty("id");
      expect(mission).toHaveProperty("titulo");
      expect(mission).toHaveProperty("posicao");
      expect(mission).toHaveProperty("emoji");
      expect(typeof mission?.titulo).toBe("string");
      expect(typeof mission?.posicao).toBe("number");
    });

    it("deve aceitar input vazio (limpar missões)", () => {
      const input = {};

      const validated = updateChallengesSchema.parse(input);

      expect(validated.titleKeys).toBeUndefined();
      expect(validated.customMissions).toBeUndefined();
    });
  });
});
