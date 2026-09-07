/**
 * Testes: Admin Sessions Use Cases
 * 
 * Cobertura:
 * - revokeHostSession: revoga sessão do anfitrião (sign-out)
 * - updateSessionName: renomeia ou oculta nome de sessão
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { revokeHostSession } from "./revoke-host-session";
import { updateSessionName } from "./update-session-name";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockRevogarHostSessao,
  mockDefinirNomeDaSessaoDoHost,
  ErroNomeInvalido,
} = vi.hoisted(() => {
  class ErroNomeInvalidoMock extends Error {
    constructor() {
      super("Nome inválido");
      this.name = "ErroNomeInvalido";
    }
  }

  return {
    mockRevogarHostSessao: vi.fn(),
    mockDefinirNomeDaSessaoDoHost: vi.fn(),
    ErroNomeInvalido: ErroNomeInvalidoMock,
  };
});

vi.mock("@albora/db", () => ({
  revogarHostSessao: mockRevogarHostSessao,
  definirNomeDaSessaoDoHost: mockDefinirNomeDaSessaoDoHost,
  ErroNomeInvalido,
}));

describe("revokeHostSession", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    sessionSecret: "secret-abc",
    token: "token-xyz",
    ...overrides,
  });

  it("deve revogar sessão com sucesso", async () => {
    mockRevogarHostSessao.mockResolvedValue(undefined);

    const input = createInput();
    await revokeHostSession(input, mockPool);

    expect(mockRevogarHostSessao).toHaveBeenCalledWith(
      mockPool,
      "secret-abc",
      "token-xyz",
    );
  });

  it("deve não fazer nada quando token é null", async () => {
    const input = createInput({ token: null });
    await revokeHostSession(input, mockPool);

    expect(mockRevogarHostSessao).not.toHaveBeenCalled();
  });

  it("deve não fazer nada quando token é undefined", async () => {
    const input = createInput({ token: undefined });
    await revokeHostSession(input, mockPool);

    expect(mockRevogarHostSessao).not.toHaveBeenCalled();
  });

  it("deve suprimir erro de revogação (best-effort)", async () => {
    mockRevogarHostSessao.mockRejectedValue(new Error("DB error"));

    const input = createInput();

    // Não deve propagar o erro
    await expect(revokeHostSession(input, mockPool)).resolves.toBeUndefined();
  });

  it("deve tentar revogar mesmo com token inválido", async () => {
    mockRevogarHostSessao.mockRejectedValue(new Error("Token inválido"));

    const input = createInput({ token: "invalid-token" });
    await revokeHostSession(input, mockPool);

    expect(mockRevogarHostSessao).toHaveBeenCalledWith(
      mockPool,
      "secret-abc",
      "invalid-token",
    );
  });
});

describe("updateSessionName", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    accountId: "acc-123",
    eventId: "evt-456",
    sessaoId: "ses-789",
    acao: "renomear" as const,
    nome: "João Silva",
    ...overrides,
  });

  it("deve renomear sessão com sucesso", async () => {
    const sessaoAtualizada = {
      id: "ses-789",
      nome: "João Silva",
      fotos: 5,
    };

    mockDefinirNomeDaSessaoDoHost.mockResolvedValue(sessaoAtualizada);

    const input = createInput();
    const result = await updateSessionName(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe("ses-789");
      expect(result.nome).toBe("João Silva");
      expect(result.fotos).toBe(5);
    }

    expect(mockDefinirNomeDaSessaoDoHost).toHaveBeenCalledWith(
      mockPool,
      "acc-123",
      "evt-456",
      "ses-789",
      { acao: "renomear", nome: "João Silva" },
    );
  });

  it("deve ocultar sessão com sucesso", async () => {
    const sessaoOcultada = {
      id: "ses-789",
      nome: "Convidado oculto",
      fotos: 3,
    };

    mockDefinirNomeDaSessaoDoHost.mockResolvedValue(sessaoOcultada);

    const input = createInput({ acao: "ocultar", nome: undefined });
    const result = await updateSessionName(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nome).toBe("Convidado oculto");
    }

    expect(mockDefinirNomeDaSessaoDoHost).toHaveBeenCalledWith(
      mockPool,
      "acc-123",
      "evt-456",
      "ses-789",
      { acao: "ocultar" },
    );
  });

  it("deve rejeitar quando sessão não é encontrada", async () => {
    mockDefinirNomeDaSessaoDoHost.mockResolvedValue(null);

    const input = createInput();
    const result = await updateSessionName(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("sessao.nao_encontrada");
      expect(result.message).toBe("Convidado não encontrado");
    }
  });

  it("deve tratar ErroNomeInvalido", async () => {
    mockDefinirNomeDaSessaoDoHost.mockRejectedValue(new ErroNomeInvalido());

    const input = createInput({ nome: "" });
    const result = await updateSessionName(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_error");
      expect(result.message).toBe("Nome inválido");
    }
  });

  it("deve propagar outros erros", async () => {
    mockDefinirNomeDaSessaoDoHost.mockRejectedValue(new Error("DB error"));

    const input = createInput();

    await expect(updateSessionName(input, mockPool)).rejects.toThrow("DB error");
  });

  it("deve usar nome vazio quando renomear sem nome", async () => {
    const sessaoAtualizada = {
      id: "ses-789",
      nome: "",
      fotos: 0,
    };

    mockDefinirNomeDaSessaoDoHost.mockResolvedValue(sessaoAtualizada);

    const input = createInput({ nome: undefined });
    await updateSessionName(input, mockPool);

    expect(mockDefinirNomeDaSessaoDoHost).toHaveBeenCalledWith(
      mockPool,
      "acc-123",
      "evt-456",
      "ses-789",
      { acao: "renomear", nome: "" },
    );
  });

  it("deve registrar log de nome atualizado", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mockDefinirNomeDaSessaoDoHost.mockResolvedValue({
      id: "ses-789",
      nome: "João",
      fotos: 5,
    });

    const input = createInput();
    await updateSessionName(input, mockPool);

    expect(consoleSpy).toHaveBeenCalledWith(
      "admin.nome_sessao",
      expect.objectContaining({
        eventoId: "evt-456",
        sessaoId: "ses-789",
        acao: "renomear",
      }),
    );

    consoleSpy.mockRestore();
  });

  it("deve registrar log ao ocultar", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mockDefinirNomeDaSessaoDoHost.mockResolvedValue({
      id: "ses-789",
      nome: "Oculto",
      fotos: 0,
    });

    const input = createInput({ acao: "ocultar" });
    await updateSessionName(input, mockPool);

    expect(consoleSpy).toHaveBeenCalledWith(
      "admin.nome_sessao",
      expect.objectContaining({
        acao: "ocultar",
      }),
    );

    consoleSpy.mockRestore();
  });

  it("deve retornar contagem de fotos da sessão", async () => {
    mockDefinirNomeDaSessaoDoHost.mockResolvedValue({
      id: "ses-789",
      nome: "Maria",
      fotos: 12,
    });

    const input = createInput({ nome: "Maria" });
    const result = await updateSessionName(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fotos).toBe(12);
    }
  });
});
