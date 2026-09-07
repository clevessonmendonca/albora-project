import { describe, it, expect } from "vitest";
import {
  validateCameraFile,
  isVideoFile,
  isImageFile,
  formatFileSize,
  createFilePreviewUrl,
  revokeFilePreviewUrl,
} from "./camera-service";

describe("camera-service", () => {
  describe("validateCameraFile", () => {
    it("aceita arquivo JPEG válido", () => {
      const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
      const result = validateCameraFile(file);
      expect(result.valid).toBe(true);
    });

    it("rejeita arquivo muito grande", () => {
      const largeData = new Uint8Array(51 * 1024 * 1024); // 51MB
      const file = new File([largeData], "large.jpg", { type: "image/jpeg" });
      const result = validateCameraFile(file);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("file-too-large");
      }
    });

    it("rejeita tipo não suportado", () => {
      const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
      const result = validateCameraFile(file);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("invalid-type");
      }
    });

    it("rejeita arquivo vazio", () => {
      const file = new File([], "empty.jpg", { type: "image/jpeg" });
      const result = validateCameraFile(file);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("corrupted");
      }
    });

    it("aceita vídeo MP4", () => {
      const file = new File(["data"], "video.mp4", { type: "video/mp4" });
      const result = validateCameraFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe("isVideoFile", () => {
    it("retorna true para vídeos", () => {
      const file = new File(["data"], "video.mp4", { type: "video/mp4" });
      expect(isVideoFile(file)).toBe(true);
    });

    it("retorna false para imagens", () => {
      const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
      expect(isVideoFile(file)).toBe(false);
    });
  });

  describe("isImageFile", () => {
    it("retorna true para imagens", () => {
      const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
      expect(isImageFile(file)).toBe(true);
    });

    it("retorna false para vídeos", () => {
      const file = new File(["data"], "video.mp4", { type: "video/mp4" });
      expect(isImageFile(file)).toBe(false);
    });
  });

  describe("formatFileSize", () => {
    it("formata bytes", () => {
      expect(formatFileSize(500)).toBe("500B");
    });

    it("formata kilobytes", () => {
      expect(formatFileSize(1536)).toBe("1.5KB");
    });

    it("formata megabytes", () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0MB");
    });
  });

  describe("createFilePreviewUrl e revokeFilePreviewUrl", () => {
    it("cria e revoga URL de preview", () => {
      const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
      const url = createFilePreviewUrl(file);

      expect(url).toMatch(/^blob:/);

      // Não vai lançar erro
      revokeFilePreviewUrl(url);
    });
  });
});
