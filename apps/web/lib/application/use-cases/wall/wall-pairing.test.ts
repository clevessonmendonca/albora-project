/**
 * Testes: Wall Pairing Use Cases
 * 
 * Cobertura:
 * - createWallPairing: cria pareamento para TV
 * - pollWallPairing: verifica status do pareamento
 * - authorizeWallPairing: autoriza pareamento com código
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWallPairing, PAIRING_TTL_SECONDS } from "./create-wall-pairing";
import { pollWallPairing, VALIDADE_DA_PAREDE_HORAS } from "./poll-wall-pairing";
import { authorizeWallPairing } from "./authorize-wall-pairing";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockCriarPareamento,
  mockFinalizarPareamento,
  mockAutorizarPareamento,
  mockWithEvent,
  mockPlanoDoEvento,
  mockPodeUsarTelao,
  ErroAutorizacaoDePareamento,
} = vi.hoisted(() => {
  class ErroAutorizacaoDePareamentoMock extends Error {
    motivo: string;
    constructor(motivo: string) {
      super(motivo);
      this.name = "ErroAutorizacaoDePareamento";
      this.motivo = motivo;
    }
  }

  return {
    mockCriarPareamento: vi.fn(),
    mockFinalizarPareamento: vi.fn(),
    mockAutorizarPareamento: vi.fn(),
    mockWithEvent: vi.fn(),
    mockPlanoDoEvento: vi.fn(),
    mockPodeUsarTelao: vi.fn(),
    ErroAutorizacaoDePareamento: ErroAutorizacaoDePareamentoMock,
  };
});

vi.mock("@albora/db", () => ({
  criarPareamento: mockCriarPareamento,
  finalizarPareamento: mockFinalizarPareamento,
  autorizarPareamento: mockAutorizarPareamento,
  withEvent: mockWithEvent,
  planoDoEvento: mockPlanoDoEvento,
  ErroAutorizacaoDePareamento,
}));

vi.mock("@albora/core", () => ({
  podeUsarTelao: mockPodeUsarTelao,
  VALIDADE_DA_PAREDE_HORAS: 24,
}));

describe("createWallPairing", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  it("deve criar pareamento com sucesso", async () => {
    const _mockExpira = new Date(Date.now() + PAIRING_TTL_SECONDS * 1000);
    mockCriarPareamento.mockResolvedValue({
      code: "ABC123",
      pollToken: "poll-token-xyz",
    });

    const result = await createWallPairing("session-secret", mockPool);

    expect(result.code).toBe("ABC123");
    expect(result.pollToken).toBe("poll-token-xyz");
    expect(result.expiraEm.getTime()).toBeGreaterThan(Date.now());
    expect(result.expiraEm.getTime()).toBeLessThanOrEqual(
      Date.now() + PAIRING_TTL_SECONDS * 1000 + 1000,
    );

    expect(mockCriarPareamento).toHaveBeenCalledWith(
      mockPool,
      "session-secret",
      expect.any(Date),
    );
  });

  it("deve calcular expiração corretamente", async () => {
    const beforeCall = Date.now();
    mockCriarPareamento.mockResolvedValue({
      code: "XYZ789",
      pollToken: "poll-token-abc",
    });

    const result = await createWallPairing("secret", mockPool);

    const diff = result.expiraEm.getTime() - beforeCall;
    const expected = PAIRING_TTL_SECONDS * 1000;

    expect(diff).toBeGreaterThanOrEqual(expected - 100);
    expect(diff).toBeLessThanOrEqual(expected + 100);
  });
});

describe("pollWallPairing", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    pollToken: "poll-token",
    sessionSecret: "session-secret",
    ...overrides,
  });

  it("deve retornar pendente quando pareamento não autorizado", async () => {
    mockFinalizarPareamento.mockResolvedValue({
      status: "pendente",
    });

    const input = createInput();
    const result = await pollWallPairing(input, mockPool);

    expect(result.status).toBe("pendente");
  });

  it("deve retornar expirado quando pareamento expirou", async () => {
    mockFinalizarPareamento.mockResolvedValue({
      status: "expirado",
    });

    const input = createInput();
    const result = await pollWallPairing(input, mockPool);

    expect(result.status).toBe("expirado");
  });

  it("deve retornar pronto com eventoId e crachá", async () => {
    mockFinalizarPareamento.mockResolvedValue({
      status: "pronto",
      eventoId: "evt-123",
      cracha: "badge-token",
    });

    const input = createInput();
    const result = await pollWallPairing(input, mockPool);

    expect(result.status).toBe("pronto");
    if (result.status === "pronto") {
      expect(result.eventoId).toBe("evt-123");
      expect(result.cracha).toBe("badge-token");
    }
  });

  it("deve calcular expiração do crachá corretamente", async () => {
    const beforeCall = Date.now();
    mockFinalizarPareamento.mockImplementation(async (
      pool,
      sessionSecret,
      pollToken,
      expiraCrachaEm,
    ) => {
      const diff = expiraCrachaEm.getTime() - beforeCall;
      const expected = VALIDADE_DA_PAREDE_HORAS * 3600 * 1000;

      expect(diff).toBeGreaterThanOrEqual(expected - 100);
      expect(diff).toBeLessThanOrEqual(expected + 100);

      return {
        status: "pronto",
        eventoId: "evt-123",
        cracha: "badge",
      };
    });

    const input = createInput();
    await pollWallPairing(input, mockPool);
  });
});

describe("authorizeWallPairing", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventoId: "evt-123",
    sessaoId: "session-456",
    codigo: "ABC123",
    ...overrides,
  });

  it("deve autorizar pareamento com sucesso", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("completo");
    mockPodeUsarTelao.mockReturnValue(true);
    mockAutorizarPareamento.mockResolvedValue(undefined);

    const input = createInput();
    const result = await authorizeWallPairing(input, mockPool);

    expect(result.ok).toBe(true);
    expect(mockAutorizarPareamento).toHaveBeenCalledWith(
      mockPool,
      "ABC123",
      "evt-123",
      "1",
      expect.any(Date),
    );
  });

  it("deve rejeitar quando plano não permite telão", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("basico");
    mockPodeUsarTelao.mockReturnValue(false);

    const input = createInput();
    const result = await authorizeWallPairing(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plano.telao");
    }
    expect(mockAutorizarPareamento).not.toHaveBeenCalled();
  });

  it("deve rejeitar quando código inválido", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("completo");
    mockPodeUsarTelao.mockReturnValue(true);
    mockAutorizarPareamento.mockRejectedValue(
      new ErroAutorizacaoDePareamento("codigo_invalido"),
    );

    const input = createInput({ codigo: "INVALID" });
    const result = await authorizeWallPairing(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("parede.pareamento_invalido");
    }
  });

  it("deve rejeitar quando código expirado", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("completo");
    mockPodeUsarTelao.mockReturnValue(true);
    mockAutorizarPareamento.mockRejectedValue(
      new ErroAutorizacaoDePareamento("expirado"),
    );

    const input = createInput();
    const result = await authorizeWallPairing(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("parede.pareamento_invalido");
      expect(result.message).toContain("inválido ou expirado");
    }
  });
});
