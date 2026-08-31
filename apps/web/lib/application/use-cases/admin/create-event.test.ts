/**
 * Testes: Create Event Use Case
 * 
 * Cobertura:
 * - createEvent: criação de evento com validações complexas
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createEvent } from "./create-event";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockCriarEvento,
  mockEmitirMagicLink,
  mockRecordProductEvent,
  mockRoleForAccountOnVendor,
  mockInstanteLocalNoFuso,
  mockParseMissionKeys,
  mockSendHostEmail,
  ErroSemAcessoAoFornecedor,
  ErroContaDoCasalInvalida,
  VALIDADE_MAGIC_LINK_MINUTOS,
  PACKS,
} = vi.hoisted(() => {
  class ErroSemAcessoAoFornecedorMock extends Error {
    constructor() {
      super("Sem acesso ao fornecedor");
      this.name = "ErroSemAcessoAoFornecedor";
    }
  }

  class ErroContaDoCasalInvalidaMock extends Error {
    constructor() {
      super("Conta do casal inválida");
      this.name = "ErroContaDoCasalInvalida";
    }
  }

  return {
    mockCriarEvento: vi.fn(),
    mockEmitirMagicLink: vi.fn(),
    mockRecordProductEvent: vi.fn(),
    mockRoleForAccountOnVendor: vi.fn(),
    mockInstanteLocalNoFuso: vi.fn(),
    mockParseMissionKeys: vi.fn(),
    mockSendHostEmail: vi.fn(),
    ErroSemAcessoAoFornecedor: ErroSemAcessoAoFornecedorMock,
    ErroContaDoCasalInvalida: ErroContaDoCasalInvalidaMock,
    VALIDADE_MAGIC_LINK_MINUTOS: 15,
    PACKS: {
      wedding: { id: "wedding", name: "Casamento" },
    },
  };
});

vi.mock("@albora/db", () => ({
  criarEvento: mockCriarEvento,
  emitirMagicLink: mockEmitirMagicLink,
  recordProductEvent: mockRecordProductEvent,
  roleForAccountOnVendor: mockRoleForAccountOnVendor,
  ErroSemAcessoAoFornecedor,
  ErroContaDoCasalInvalida,
  VALIDADE_MAGIC_LINK_MINUTOS,
}));

vi.mock("@albora/core", () => ({
  instanteLocalNoFuso: mockInstanteLocalNoFuso,
}));

vi.mock("@albora/packs", () => ({
  PACKS,
}));

vi.mock("@/features/admin/lib/mission-keys", () => ({
  parseMissionKeys: mockParseMissionKeys,
}));

vi.mock("@/lib/email", () => ({
  sendHostEmail: mockSendHostEmail,
}));

describe("createEvent", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    accountId: "acc-123",
    sessionSecret: "secret",
    packId: "wedding",
    comecaEm: "2026-09-01T10:00:00",
    terminaEm: "2026-09-01T22:00:00",
    timezone: "America/Sao_Paulo",
    expectedGuests: 100,
    identityTokens: { primary: "var(--color-primary)" },
    title: "Casamento Maria e João",
    requestOrigin: "https://albora.app",
    ...overrides,
  });

  it("deve criar evento com sucesso", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00-03:00");
    const terminaEm = new Date("2026-09-01T22:00:00-03:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockCriarEvento.mockResolvedValue({
      eventoId: "evt-123",
      slug: "maria-joao",
    });
    mockRecordProductEvent.mockResolvedValue(undefined);

    const input = createInput();
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eventoId).toBe("evt-123");
      expect(result.slug).toBe("maria-joao");
    }

    expect(mockCriarEvento).toHaveBeenCalledWith(
      mockPool,
      expect.objectContaining({
        accountId: "acc-123",
        packId: "wedding",
        comecaEm,
        terminaEm,
        expectedGuests: 100,
        fuso: "America/Sao_Paulo",
        title: "Casamento Maria e João",
      }),
    );
    expect(mockRecordProductEvent).toHaveBeenCalledWith(mockPool, "event_created");
  });

  it("deve rejeitar datas inválidas", async () => {
    mockInstanteLocalNoFuso.mockReturnValue(null);

    const input = createInput();
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_error");
      expect(result.message).toBe("Datas inválidas");
    }

    expect(mockCriarEvento).not.toHaveBeenCalled();
  });

  it("deve rejeitar quando término <= início", async () => {
    const comecaEm = new Date("2026-09-01T22:00:00");
    const terminaEm = new Date("2026-09-01T10:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);

    const input = createInput();
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_error");
    }
  });

  it("deve incluir modelos do telão nos tokens", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockCriarEvento.mockResolvedValue({
      eventoId: "evt-123",
      slug: "test",
    });

    const input = createInput({
      telaoModelos: ["modelo-1", "modelo-2"],
    });
    await createEvent(input, mockPool);

    expect(mockCriarEvento).toHaveBeenCalledWith(
      mockPool,
      expect.objectContaining({
        identityTokens: expect.objectContaining({
          telaoModelos: ["modelo-1", "modelo-2"],
        }),
      }),
    );
  });

  it("deve validar missões customizadas", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockParseMissionKeys.mockReturnValue(["missao-1", "missao-2"]);
    mockCriarEvento.mockResolvedValue({
      eventoId: "evt-123",
      slug: "test",
    });

    const input = createInput({
      missoes: ["missao-1", "missao-2"],
    });
    await createEvent(input, mockPool);

    expect(mockParseMissionKeys).toHaveBeenCalledWith(
      PACKS.wedding,
      ["missao-1", "missao-2"],
    );
    expect(mockCriarEvento).toHaveBeenCalledWith(
      mockPool,
      expect.objectContaining({
        missoes: ["missao-1", "missao-2"],
      }),
    );
  });

  it("deve rejeitar missões inválidas", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockParseMissionKeys.mockReturnValue(null);

    const input = createInput({
      missoes: ["missao-invalida"],
    });
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_error");
      expect(result.message).toBe("Missões inválidas");
    }
  });

  it("deve criar evento com vendor e enviar e-mail para casal", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockRoleForAccountOnVendor.mockResolvedValue("admin");
    mockEmitirMagicLink.mockResolvedValue({
      token: "magic-token",
      accountId: "couple-acc-456",
      isNewAccount: true,
    });
    mockCriarEvento.mockResolvedValue({
      eventoId: "evt-123",
      slug: "test",
    });
    mockRecordProductEvent.mockResolvedValue(undefined);
    mockSendHostEmail.mockResolvedValue(undefined);

    const input = createInput({
      vendorId: "vendor-789",
      coupleEmail: "casal@example.com",
    });
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(true);
    expect(mockRoleForAccountOnVendor).toHaveBeenCalledWith(mockPool, "acc-123", "vendor-789");
    expect(mockEmitirMagicLink).toHaveBeenCalled();
    expect(mockCriarEvento).toHaveBeenCalledWith(
      mockPool,
      expect.objectContaining({
        vendorId: "vendor-789",
        coupleAccountId: "couple-acc-456",
      }),
    );
    expect(mockSendHostEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "casal@example.com",
        subject: expect.stringContaining("evento"),
      }),
    );
    expect(mockRecordProductEvent).toHaveBeenCalledWith(mockPool, "account_created");
    expect(mockRecordProductEvent).toHaveBeenCalledWith(mockPool, "event_created");
  });

  it("deve rejeitar vendor sem e-mail do casal", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);

    const input = createInput({
      vendorId: "vendor-789",
    });
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_error");
      expect(result.message).toContain("E-mail do casal obrigatório");
    }
  });

  it("deve rejeitar quando conta não tem acesso ao vendor", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockRoleForAccountOnVendor.mockResolvedValue(null);

    const input = createInput({
      vendorId: "vendor-789",
      coupleEmail: "casal@example.com",
    });
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("vendor.no_access");
    }
  });

  it("deve rejeitar quando e-mail do casal é o mesmo da conta criadora", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockRoleForAccountOnVendor.mockResolvedValue("admin");
    mockEmitirMagicLink.mockResolvedValue({
      token: "magic-token",
      accountId: "acc-123", // Mesmo ID da conta criadora
      isNewAccount: false,
    });

    const input = createInput({
      vendorId: "vendor-789",
      coupleEmail: "casal@example.com",
    });
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_error");
      expect(result.message).toContain("não pode ser o seu");
    }
  });

  it("deve tratar ErroSemAcessoAoFornecedor", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockRoleForAccountOnVendor.mockResolvedValue("admin");
    mockEmitirMagicLink.mockResolvedValue({
      token: "magic-token",
      accountId: "couple-acc-456",
      isNewAccount: false,
    });
    mockCriarEvento.mockRejectedValue(new ErroSemAcessoAoFornecedor());

    const input = createInput({
      vendorId: "vendor-789",
      coupleEmail: "casal@example.com",
    });
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("vendor.no_access");
    }
  });

  it("deve tratar ErroContaDoCasalInvalida", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockCriarEvento.mockRejectedValue(new ErroContaDoCasalInvalida());

    const input = createInput();
    const result = await createEvent(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_error");
      expect(result.message).toContain("E-mail do casal inválido");
    }
  });

  it("deve propagar outros erros", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockCriarEvento.mockRejectedValue(new Error("DB error"));

    const input = createInput();

    await expect(createEvent(input, mockPool)).rejects.toThrow("DB error");
  });

  it("deve não registrar account_created para conta existente", async () => {
    const comecaEm = new Date("2026-09-01T10:00:00");
    const terminaEm = new Date("2026-09-01T22:00:00");

    mockInstanteLocalNoFuso
      .mockReturnValueOnce(comecaEm)
      .mockReturnValueOnce(terminaEm);
    mockRoleForAccountOnVendor.mockResolvedValue("staff");
    mockEmitirMagicLink.mockResolvedValue({
      token: "magic-token",
      accountId: "couple-acc-456",
      isNewAccount: false, // Conta existente
    });
    mockCriarEvento.mockResolvedValue({
      eventoId: "evt-123",
      slug: "test",
    });

    const input = createInput({
      vendorId: "vendor-789",
      coupleEmail: "casal@example.com",
    });
    await createEvent(input, mockPool);

    expect(mockRecordProductEvent).toHaveBeenCalledTimes(1);
    expect(mockRecordProductEvent).toHaveBeenCalledWith(mockPool, "event_created");
  });
});
