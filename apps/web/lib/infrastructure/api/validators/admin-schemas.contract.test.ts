/**
 * Contract Tests: Admin Schemas → Admin Use Cases
 * 
 * Valida que os schemas Zod de admin estão corretos e que seu output é aceito pelos use cases.
 */

import { describe, it, expect } from "vitest";
import { setMusicSchema } from "./admin-schemas";

describe("setMusicSchema → setMusic Contract", () => {
  describe("✅ Validação de Input Correto", () => {
    it("deve validar URL de Spotify", () => {
      const input = {
        url: "https://open.spotify.com/track/abc123",
      };

      const validated = setMusicSchema.parse(input);

      expect(validated.url).toBe(input.url);
    });

    it("deve validar URL de YouTube", () => {
      const input = {
        url: "https://www.youtube.com/watch?v=abc123",
      };

      const validated = setMusicSchema.parse(input);

      expect(validated.url).toBe(input.url);
    });

    it("deve validar URL de Apple Music", () => {
      const input = {
        url: "https://music.apple.com/br/album/abc123",
      };

      const validated = setMusicSchema.parse(input);

      expect(validated.url).toBe(input.url);
    });

    it("deve trimar URL com espaços", () => {
      const input = {
        url: "  https://open.spotify.com/track/abc123  ",
      };

      const validated = setMusicSchema.parse(input);

      expect(validated.url).toBe("https://open.spotify.com/track/abc123");
    });

    it("deve aceitar URL genérica", () => {
      const input = {
        url: "https://example.com/music/track",
      };

      const validated = setMusicSchema.parse(input);

      expect(validated.url).toBe(input.url);
    });
  });

  describe("❌ Rejeição de Input Inválido", () => {
    it("deve rejeitar URL vazia", () => {
      const input = {
        url: "",
      };

      expect(() => setMusicSchema.parse(input)).toThrow(/Cole o link da faixa/i);
    });

    it("deve rejeitar URL ausente", () => {
      const input = {};

      expect(() => setMusicSchema.parse(input)).toThrow();
    });
  });

  describe("🔄 Compatibilidade com Use Case", () => {
    it("deve produzir output compatível com setMusic use case", () => {
      const input = {
        url: "https://open.spotify.com/track/example",
      };

      const validated = setMusicSchema.parse(input);

      expect(validated).toHaveProperty("url");
      expect(typeof validated.url).toBe("string");
    });
  });
});
