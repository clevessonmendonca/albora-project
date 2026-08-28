/**
 * Contract Tests: Export Schemas → Export Use Cases
 */

import { describe, it, expect } from "vitest";
import { createExportSchema, getExportSchema, getExportFileSchema } from "./export-schemas";

describe("Export Schemas Contracts", () => {
  describe("createExportSchema", () => {
    it("deve validar token válido", () => {
      const input = { token: "abc123" };
      const validated = createExportSchema.parse(input);
      expect(validated.token).toBe("abc123");
      expect(validated.curated).toBe(false);
    });

    it("deve validar curated true", () => {
      const input = { token: "abc123", curated: true };
      const validated = createExportSchema.parse(input);
      expect(validated.curated).toBe(true);
    });

    it("deve rejeitar token vazio", () => {
      const input = { token: "" };
      expect(() => createExportSchema.parse(input)).toThrow(/Confirme o download/i);
    });
  });

  describe("getExportSchema", () => {
    it("deve validar modo full", () => {
      const input = { modo: "full" as const };
      const validated = getExportSchema.parse(input);
      expect(validated.modo).toBe("full");
    });

    it("deve validar modo curated", () => {
      const input = { modo: "curated" as const };
      const validated = getExportSchema.parse(input);
      expect(validated.modo).toBe("curated");
    });

    it("deve validar sem modo (opcional)", () => {
      const input = {};
      const validated = getExportSchema.parse(input);
      expect(validated.modo).toBeUndefined();
    });

    it("deve rejeitar modo inválido", () => {
      const input = { modo: "invalid" };
      expect(() => getExportSchema.parse(input)).toThrow();
    });
  });

  describe("getExportFileSchema", () => {
    it("deve validar job UUID válido", () => {
      const input = { job: "550e8400-e29b-41d4-a716-446655440000" };
      const validated = getExportFileSchema.parse(input);
      expect(validated.job).toBe(input.job);
    });

    it("deve rejeitar job inválido", () => {
      const input = { job: "not-a-uuid" };
      expect(() => getExportFileSchema.parse(input)).toThrow(/Job inválido/i);
    });
  });
});
