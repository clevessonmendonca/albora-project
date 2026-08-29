import { describe, it, expect } from "vitest";
import { maskPii, maskObject, addPiiField } from "./structured-logging";

describe("maskPii", () => {
  it("mascara nome completo", () => {
    expect(maskPii("João Silva")).toBe("J***a");
  });

  it("mascara email", () => {
    expect(maskPii("joao@example.com")).toBe("j***@e***");
  });

  it("mascara telefone", () => {
    expect(maskPii("11987654321")).toBe("119****4321");
  });

  it("mascara CPF", () => {
    expect(maskPii("12345678900")).toBe("123****8900");
  });

  it("retorna *** para strings muito curtas", () => {
    expect(maskPii("ab")).toBe("***");
    expect(maskPii("")).toBe("***");
  });
});

describe("maskObject", () => {
  it("mascara campos de PII", () => {
    const obj = {
      name: "João Silva",
      email: "joao@example.com",
      eventId: "evt-123",
      sessionId: "sess-456",
    };

    const masked = maskObject(obj);

    expect(masked.name).toBe("J***a");
    expect(masked.email).toBe("j***@e***");
    expect(masked.eventId).toBe("evt-123");
    expect(masked.sessionId).toBe("sess-456");
  });

  it("mascara PII em objetos aninhados", () => {
    const obj = {
      user: {
        name: "Maria Santos",
        phone: "11987654321",
      },
      eventId: "evt-123",
    };

    const masked = maskObject(obj);

    expect((masked.user as { name: string }).name).toBe("M***s");
    expect((masked.user as { name: string; phone?: string }).phone).toBe("119****4321");
    expect(masked.eventId).toBe("evt-123");
  });

  it("não quebra com valores null ou undefined", () => {
    const obj = {
      name: null,
      email: undefined,
      eventId: "evt-123",
    };

    const masked = maskObject(obj);

    expect(masked.name).toBeNull();
    expect(masked.email).toBeUndefined();
    expect(masked.eventId).toBe("evt-123");
  });
});

describe("addPiiField", () => {
  it("adiciona campo customizado para mascarar", () => {
    addPiiField("customerId");

    const obj = {
      customerId: "12345678900",
      eventId: "evt-123",
    };

    const masked = maskObject(obj);

    expect(masked.customerId).toBe("123****8900");
    expect(masked.eventId).toBe("evt-123");
  });
});
