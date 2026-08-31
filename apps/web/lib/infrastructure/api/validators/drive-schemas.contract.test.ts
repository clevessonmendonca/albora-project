/**
 * Contract Tests: Drive Schemas → Drive Use Cases
 */

import { describe, it, expect } from "vitest";
import { driveConnectSchema, driveCallbackSchema } from "./drive-schemas";

describe("Drive Schemas Contracts", () => {
  describe("driveConnectSchema", () => {
    it("deve validar confirmacao válida", () => {
      const input = { confirmacao: "sim" };
      const validated = driveConnectSchema.parse(input);
      expect(validated.confirmacao).toBe("sim");
    });

    it("deve rejeitar confirmacao vazia", () => {
      const input = { confirmacao: "" };
      expect(() => driveConnectSchema.parse(input)).toThrow(/Confirme a conexão/i);
    });
  });

  describe("driveCallbackSchema", () => {
    it("deve validar code e state", () => {
      const input = { code: "abc123", state: "xyz789" };
      const validated = driveCallbackSchema.parse(input);
      expect(validated.code).toBe("abc123");
      expect(validated.state).toBe("xyz789");
    });

    it("deve rejeitar code vazio", () => {
      const input = { code: "", state: "xyz" };
      expect(() => driveCallbackSchema.parse(input)).toThrow(/Code obrigatório/i);
    });

    it("deve rejeitar state vazio", () => {
      const input = { code: "abc", state: "" };
      expect(() => driveCallbackSchema.parse(input)).toThrow(/State obrigatório/i);
    });
  });
});
