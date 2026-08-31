/**
 * Testes: App Pairing Use Cases
 * 
 * Cobertura:
 * - createAppPairing: cria código de 4 dígitos
 * - redeemAppPairing: resgata código ou passagem
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAppPairing, CODE_TTL_MINUTES } from "./create-app-pairing";
import { redeemAppPairing } from "./redeem-app-pairing";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockCriarCodigoPareamentoApp,
  mockResgatarCodigoPareamentoApp,
  mockResgatarPassagemPareamentoApp,
  ErroResgateDePareamento,
} = vi.hoisted(() => {
  class ErroResgateDePareamentoMock extends Error {
    motivo: string;
    constructor(motivo: string) {
      super(`Erro de resgate: ${motivo}`);
      this.name = "ErroResgateDePareamento";
      this.motivo = motivo;
    }
  }

  return {
    mockCriarCodigoPareamentoApp: vi.fn(),
    mockResgatarCodigoPareamentoApp: vi.fn(),
    mockResgatarPassagemPareamentoApp: vi.fn(),
    ErroResgateDePareamento: ErroResgateDePareamentoMock,
  };
});

vi.mock("@albora/db", () => ({
  criarCodigoPareamentoApp: mockCriarCodigoPareamentoApp,
  resgatarCodigoPareamentoApp: mockResgatarCodigoPareamentoApp,
  resgatarPassagemPareamentoApp: mockResgatarPassagemPareamentoApp,
  ErroResgateDePareamento,
}));

describe("createAppPairing", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    sessaoId: "ses-456",
    sessionSecret: "secret-token",
    ...overrides,
  });

  it("deve criar código de pareamento com sucesso", async () => {
    const expiraEm = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    const codigoMock = "1234";
    const passagemMock = "pass-abc123";

    mockCriarCodigoPareamentoApp.mockResolvedValue({
      code: codigoMock,
      expiraEm,
      passagem: passagemMock,
    });

    const input = createInput();
    const result = await createAppPairing(input, mockPool);

    expect(result.codigo).toBe(codigoMock);
    expect(result.passagem).toBe(passagemMock);
    expect(result.validadeMinutos).toBe(CODE_TTL_MINUTES);
    expect(result.expiraEm).toBeInstanceOf(Date);

    expect(mockCriarCodigoPareamentoApp).toHaveBeenCalledWith(
      mockPool,
      "secret-token",
      "evt-123",
      "ses-456",
      expect.any(Date),
    );
  });

  it("deve definir expiração correta baseada em TTL", async () => {
    const agora = Date.now();
    const expiraEm = new Date(agora + CODE_TTL_MINUTES * 60 * 1000);

    mockCriarCodigoPareamentoApp.mockResolvedValue({
      code: "1234",
      expiraEm,
      passagem: "pass-abc",
    });

    const input = createInput();
    const result = await createAppPairing(input, mockPool);

    const expiraEmMs = result.expiraEm.getTime();
    const expectedMs = agora + CODE_TTL_MINUTES * 60 * 1000;
    
    // Tolera diferença de até 1 segundo devido a execução do teste
    expect(Math.abs(expiraEmMs - expectedMs)).toBeLessThan(1000);
  });

  it("deve retornar validadeMinutos constante", async () => {
    mockCriarCodigoPareamentoApp.mockResolvedValue({
      code: "1234",
      expiraEm: new Date(),
      passagem: "pass-abc",
    });

    const input = createInput();
    const result = await createAppPairing(input, mockPool);

    expect(result.validadeMinutos).toBe(15);
  });

  it("deve propagar erro do banco", async () => {
    mockCriarCodigoPareamentoApp.mockRejectedValue(new Error("DB error"));

    const input = createInput();

    await expect(createAppPairing(input, mockPool)).rejects.toThrow("DB error");
  });
});

describe("redeemAppPairing", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    sessionSecret: "secret-token",
    duracaoSessaoHoras: 48,
    ...overrides,
  });

  it("deve resgatar código com sucesso", async () => {
    const resgateMock = {
      slug: "evento-slug",
      sessaoId: "ses-456",
      token: "token-abc",
      eventoId: "evt-123",
    };

    mockResgatarCodigoPareamentoApp.mockResolvedValue(resgateMock);

    const input = createInput({ codigo: "1234" });
    const result = await redeemAppPairing(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slug).toBe("evento-slug");
      expect(result.sessaoId).toBe("ses-456");
      expect(result.token).toBe("token-abc");
      expect(result.eventoId).toBe("evt-123");
    }

    expect(mockResgatarCodigoPareamentoApp).toHaveBeenCalledWith(
      mockPool,
      "secret-token",
      "1234",
      48,
      expect.any(Date),
    );
  });

  it("deve resgatar passagem com sucesso", async () => {
    const resgateMock = {
      slug: "evento-slug",
      sessaoId: "ses-456",
      token: "token-abc",
      eventoId: "evt-123",
    };

    mockResgatarPassagemPareamentoApp.mockResolvedValue(resgateMock);

    const input = createInput({ passagem: "pass-abc123" });
    const result = await redeemAppPairing(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slug).toBe("evento-slug");
    }

    expect(mockResgatarPassagemPareamentoApp).toHaveBeenCalledWith(
      mockPool,
      "secret-token",
      "pass-abc123",
      48,
      expect.any(Date),
    );
    expect(mockResgatarCodigoPareamentoApp).not.toHaveBeenCalled();
  });

  it("deve recusar quando nem código nem passagem são fornecidos", async () => {
    const input = createInput();
    const result = await redeemAppPairing(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("app.pareamento_invalido");
      expect(result.message).toBe("Código ou passagem obrigatório");
    }

    expect(mockResgatarCodigoPareamentoApp).not.toHaveBeenCalled();
    expect(mockResgatarPassagemPareamentoApp).not.toHaveBeenCalled();
  });

  it("deve tratar código expirado", async () => {
    mockResgatarCodigoPareamentoApp.mockRejectedValue(
      new ErroResgateDePareamento("codigo_expirado"),
    );

    const input = createInput({ codigo: "1234" });
    const result = await redeemAppPairing(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("app.pareamento_invalido");
      expect(result.message).toBe("Código inválido ou expirado");
    }
  });

  it("deve tratar código inválido", async () => {
    mockResgatarCodigoPareamentoApp.mockRejectedValue(
      new ErroResgateDePareamento("codigo_nao_encontrado"),
    );

    const input = createInput({ codigo: "9999" });
    const result = await redeemAppPairing(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("app.pareamento_invalido");
    }
  });

  it("deve tratar passagem já usada", async () => {
    mockResgatarPassagemPareamentoApp.mockRejectedValue(
      new ErroResgateDePareamento("passagem_ja_usada"),
    );

    const input = createInput({ passagem: "pass-abc123" });
    const result = await redeemAppPairing(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("app.pareamento_invalido");
      expect(result.message).toBe("Código inválido ou expirado");
    }
  });

  it("deve propagar erro não esperado", async () => {
    mockResgatarCodigoPareamentoApp.mockRejectedValue(new Error("DB error"));

    const input = createInput({ codigo: "1234" });

    await expect(redeemAppPairing(input, mockPool)).rejects.toThrow("DB error");
  });

  it("deve preferir passagem sobre código quando ambos fornecidos", async () => {
    const resgateMock = {
      slug: "evento-slug",
      sessaoId: "ses-456",
      token: "token-abc",
      eventoId: "evt-123",
    };

    mockResgatarPassagemPareamentoApp.mockResolvedValue(resgateMock);

    const input = createInput({
      codigo: "1234",
      passagem: "pass-abc123",
    });
    await redeemAppPairing(input, mockPool);

    expect(mockResgatarPassagemPareamentoApp).toHaveBeenCalled();
    expect(mockResgatarCodigoPareamentoApp).not.toHaveBeenCalled();
  });

  it("deve passar data atual para resgate", async () => {
    const resgateMock = {
      slug: "evento-slug",
      sessaoId: "ses-456",
      token: "token-abc",
      eventoId: "evt-123",
    };

    mockResgatarCodigoPareamentoApp.mockResolvedValue(resgateMock);

    const input = createInput({ codigo: "1234" });
    await redeemAppPairing(input, mockPool);

    expect(mockResgatarCodigoPareamentoApp).toHaveBeenCalledWith(
      mockPool,
      "secret-token",
      "1234",
      48,
      expect.any(Date),
    );
  });
});
