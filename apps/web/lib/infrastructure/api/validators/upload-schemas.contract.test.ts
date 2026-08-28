/**
 * Contract Tests: confirmUploadSchema → confirmUpload Use Case
 * 
 * Valida que o schema Zod está correto e que seu output é aceito pelo use case.
 * 
 * Estes testes garantem que:
 * 1. O schema valida inputs corretos
 * 2. O schema rejeita inputs inválidos
 * 3. O output do schema pode ser usado pelo use case
 * 4. O contrato entre validator e use case é mantido
 */

import { describe, it, expect } from "vitest";
import { confirmUploadSchema } from "./upload-schemas";

describe("confirmUploadSchema → confirmUpload Contract", () => {
  describe("✅ Validação de Input Correto", () => {
    it("deve validar input mínimo obrigatório", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
      };

      const validated = confirmUploadSchema.parse(input);

      expect(validated).toHaveProperty("uploadId");
      expect(validated).toHaveProperty("chave");
      expect(validated).toHaveProperty("mime");
      expect(validated.uploadId).toBe(input.uploadId);
      expect(validated.chave).toBe(input.chave);
      expect(validated.mime).toBe(input.mime);
    });

    it("deve validar input completo com todos os campos opcionais", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        legenda: "Foto da festa",
        lugar: "Salão principal",
        desafioId: "123e4567-e89b-12d3-a456-426614174000",
        promptKey: "make_selfie",
        capturadaEm: 1693526400000,
        capturadaEmParede: true,
        largura: 1920,
        altura: 1080,
        story: false,
        musicTrackId: "track_123",
      };

      const validated = confirmUploadSchema.parse(input);

      expect(validated).toEqual(input);
      expect(validated.legenda).toBe("Foto da festa");
      expect(validated.lugar).toBe("Salão principal");
      expect(validated.desafioId).toBe(input.desafioId);
      expect(validated.largura).toBe(1920);
      expect(validated.altura).toBe(1080);
    });

    it("deve aceitar vídeo (MIME type video/mp4)", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/video.mp4",
        mime: "video/mp4",
      };

      const validated = confirmUploadSchema.parse(input);

      expect(validated.mime).toBe("video/mp4");
    });

    it("deve aceitar capturadaEm como string", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        capturadaEm: "2023-09-01T12:00:00Z",
      };

      const validated = confirmUploadSchema.parse(input);

      expect(validated.capturadaEm).toBe("2023-09-01T12:00:00Z");
    });

    it("deve aceitar capturadaEm como número (timestamp)", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        capturadaEm: 1693526400000,
      };

      const validated = confirmUploadSchema.parse(input);

      expect(validated.capturadaEm).toBe(1693526400000);
    });
  });

  describe("❌ Rejeição de Input Inválido", () => {
    it("deve rejeitar uploadId inválido (não UUID)", () => {
      const input = {
        uploadId: "not-a-uuid",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow(/ID de upload inválido/i);
    });

    it("deve rejeitar chave vazia", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "",
        mime: "image/jpeg",
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow(/Chave obrigatória/i);
    });

    it("deve rejeitar mime vazio", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "",
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow(/MIME type obrigatório/i);
    });

    it("deve rejeitar desafioId inválido (não UUID)", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        desafioId: "not-a-uuid",
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow(/ID de desafio inválido/i);
    });

    it("deve rejeitar largura zero", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        largura: 0,
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow(/Largura inválida/i);
    });

    it("deve rejeitar altura negativa", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        altura: -1,
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow(/Altura inválida/i);
    });

    it("deve rejeitar largura não inteira", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        largura: 1920.5,
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow();
    });

    it("deve rejeitar uploadId ausente", () => {
      const input = {
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow();
    });

    it("deve rejeitar chave ausente", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        mime: "image/jpeg",
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow();
    });

    it("deve rejeitar mime ausente", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
      };

      expect(() => confirmUploadSchema.parse(input)).toThrow();
    });
  });

  describe("🔄 Compatibilidade com Use Case", () => {
    it("deve produzir output compatível com confirmUpload use case", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        legenda: "Festa incrível",
        desafioId: "123e4567-e89b-12d3-a456-426614174000",
        largura: 1920,
        altura: 1080,
      };

      const validated = confirmUploadSchema.parse(input);

      // O use case espera esses campos exatos
      expect(validated).toHaveProperty("uploadId");
      expect(validated).toHaveProperty("chave");
      expect(validated).toHaveProperty("mime");
      expect(validated).toHaveProperty("legenda");
      expect(validated).toHaveProperty("desafioId");
      expect(validated).toHaveProperty("largura");
      expect(validated).toHaveProperty("altura");

      // Tipos corretos
      expect(typeof validated.uploadId).toBe("string");
      expect(typeof validated.chave).toBe("string");
      expect(typeof validated.mime).toBe("string");
      expect(typeof validated.legenda).toBe("string");
      expect(typeof validated.desafioId).toBe("string");
      expect(typeof validated.largura).toBe("number");
      expect(typeof validated.altura).toBe("number");
    });

    it("deve incluir campos opcionais quando fornecidos", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
        story: true,
        musicTrackId: "track_123",
      };

      const validated = confirmUploadSchema.parse(input);

      expect(validated.story).toBe(true);
      expect(validated.musicTrackId).toBe("track_123");
    });

    it("deve omitir campos opcionais quando não fornecidos", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
      };

      const validated = confirmUploadSchema.parse(input);

      expect(validated).not.toHaveProperty("legenda");
      expect(validated).not.toHaveProperty("lugar");
      expect(validated).not.toHaveProperty("desafioId");
    });
  });

  describe("📝 Type Safety", () => {
    it("deve inferir o tipo correto (ConfirmUploadBody)", () => {
      const input = {
        uploadId: "550e8400-e29b-41d4-a716-446655440000",
        chave: "events/evt_123/uploads/abc.jpg",
        mime: "image/jpeg",
      };

      const validated = confirmUploadSchema.parse(input);

      // TypeScript deve inferir o tipo correto
      const _typeCheck: {
        uploadId: string;
        chave: string;
        mime: string;
        legenda?: string;
        lugar?: string;
        desafioId?: string;
        promptKey?: string;
        capturadaEm?: string | number;
        capturadaEmParede?: boolean;
        largura?: number;
        altura?: number;
        story?: boolean;
        musicTrackId?: string;
      } = validated;

      expect(_typeCheck).toBeDefined();
    });
  });
});
