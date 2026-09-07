/**
 * Contract Tests: Auth Schemas → Auth Use Cases
 */

import { describe, it, expect } from "vitest";
import { signInSchema, consumeMagicLinkSchema } from "./auth-schemas";

describe("Auth Schemas Contracts", () => {
  describe("signInSchema", () => {
    it("deve validar email válido", () => {
      const input = { email: "test@example.com" };
      const validated = signInSchema.parse(input);
      expect(validated.email).toBe("test@example.com");
    });

    it("deve validar com next válido", () => {
      const input = { email: "test@example.com", next: "/admin/events" };
      const validated = signInSchema.parse(input);
      expect(validated.next).toBe("/admin/events");
    });

    it("deve trimar email", () => {
      const input = { email: "  test@example.com  " };
      const validated = signInSchema.parse(input);
      expect(validated.email).toBe("test@example.com");
    });

    it("deve rejeitar email inválido", () => {
      const input = { email: "invalid-email" };
      expect(() => signInSchema.parse(input)).toThrow(/E-mail inválido/i);
    });

    it("deve rejeitar next que não começa com /admin", () => {
      const input = { email: "test@example.com", next: "/home" };
      expect(() => signInSchema.parse(input)).toThrow(/Próxima URL inválida/i);
    });

    it("deve rejeitar next com //", () => {
      const input = { email: "test@example.com", next: "//evil.com" };
      expect(() => signInSchema.parse(input)).toThrow(/Próxima URL inválida/i);
    });
  });

  describe("consumeMagicLinkSchema", () => {
    it("deve validar token válido", () => {
      const input = { token: "abc123xyz" };
      const validated = consumeMagicLinkSchema.parse(input);
      expect(validated.token).toBe("abc123xyz");
    });

    it("deve rejeitar token vazio", () => {
      const input = { token: "" };
      expect(() => consumeMagicLinkSchema.parse(input)).toThrow(/Token obrigatório/i);
    });
  });
});
