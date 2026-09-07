/**
 * Testes: Admin Step-Up Use Cases
 * 
 * Cobertura:
 * - requestDriveStepUp: emite magic link para Drive
 * - requestExportStepUp: emite magic link para export
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { requestDriveStepUp, VALIDADE_STEP_UP_DRIVE_MINUTOS } from "./request-drive-step-up";
import { requestExportStepUp } from "./request-export-step-up";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockEmitirStepUp,
  mockSendHostEmail,
  mockWithEvent,
  mockPlanoDoEvento,
  mockPodeBaixarZip,
  ACAO_DRIVE_CONNECT,
  VALIDADE_STEP_UP_MINUTOS,
} = vi.hoisted(() => ({
  mockEmitirStepUp: vi.fn(),
  mockSendHostEmail: vi.fn(),
  mockWithEvent: vi.fn(),
  mockPlanoDoEvento: vi.fn(),
  mockPodeBaixarZip: vi.fn(),
  ACAO_DRIVE_CONNECT: "drive_connect",
  VALIDADE_STEP_UP_MINUTOS: 15,
}));

vi.mock("@albora/db", () => ({
  emitirStepUp: mockEmitirStepUp,
  withEvent: mockWithEvent,
  planoDoEvento: mockPlanoDoEvento,
  VALIDADE_STEP_UP_MINUTOS,
}));

vi.mock("@albora/core", () => ({
  ACAO_DRIVE_CONNECT,
  podeBaixarZip: mockPodeBaixarZip,
}));

vi.mock("@/lib/email", () => ({
  sendHostEmail: mockSendHostEmail,
}));

describe("requestDriveStepUp", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    hostEmail: "host@example.com",
    sessionSecret: "secret",
    requestOrigin: "https://albora.app",
    isDev: false,
    ...overrides,
  });

  it("deve enviar step-up para Drive em produção", async () => {
    mockEmitirStepUp.mockResolvedValue({ token: "token-abc" });

    const input = createInput();
    const result = await requestDriveStepUp(input, mockPool);

    expect(result.enviado).toBe(true);
    expect(result.link).toBeUndefined();

    const expectedExpiresAt = expect.any(Date);
    expect(mockEmitirStepUp).toHaveBeenCalledWith(
      mockPool,
      "secret",
      "acc-456",
      expectedExpiresAt,
      ACAO_DRIVE_CONNECT,
    );

    expect(mockSendHostEmail).toHaveBeenCalledWith({
      to: "host@example.com",
      subject: "Confirme a conexão com o Google Drive",
      text: expect.stringContaining("driveConectar=token-abc"),
    });
  });

  it("deve incluir link em modo dev", async () => {
    mockEmitirStepUp.mockResolvedValue({ token: "token-dev" });

    const input = createInput({ isDev: true });
    const result = await requestDriveStepUp(input, mockPool);

    expect(result.enviado).toBe(true);
    expect(result.link).toBe("https://albora.app/admin/e/evt-123/album?driveConectar=token-dev");
  });

  it("deve calcular expiresAt corretamente", async () => {
    const beforeCall = Date.now();
    mockEmitirStepUp.mockResolvedValue({ token: "token" });

    const input = createInput();
    await requestDriveStepUp(input, mockPool);

    const callArgs = mockEmitirStepUp.mock.calls[0]!;
    const expiresAt = callArgs[3] as Date;
    const expectedMs = VALIDADE_STEP_UP_DRIVE_MINUTOS * 60 * 1000;
    const diff = expiresAt.getTime() - beforeCall;

    expect(diff).toBeGreaterThanOrEqual(expectedMs - 100);
    expect(diff).toBeLessThanOrEqual(expectedMs + 100);
  });

  it("deve incluir link no corpo do e-mail", async () => {
    mockEmitirStepUp.mockResolvedValue({ token: "token-xyz" });

    const input = createInput();
    await requestDriveStepUp(input, mockPool);

    const emailCall = mockSendHostEmail.mock.calls[0]![0];
    expect(emailCall.text).toContain("https://albora.app/admin/e/evt-123/album?driveConectar=token-xyz");
    expect(emailCall.text).toContain("15 minutos");
  });
});

describe("requestExportStepUp", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    hostEmail: "host@example.com",
    sessionSecret: "secret",
    requestOrigin: "https://albora.app",
    isDev: false,
    ...overrides,
  });

  it("deve enviar step-up para export em produção", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("completo");
    mockPodeBaixarZip.mockReturnValue(true);
    mockEmitirStepUp.mockResolvedValue({ token: "token-abc" });

    const input = createInput();
    const result = await requestExportStepUp(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.enviado).toBe(true);
      expect(result.link).toBeUndefined();
    }

    expect(mockSendHostEmail).toHaveBeenCalledWith({
      to: "host@example.com",
      subject: "Confirme o download do álbum",
      text: expect.stringContaining("exportar=token-abc"),
    });
  });

  it("deve incluir link em modo dev", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("completo");
    mockPodeBaixarZip.mockReturnValue(true);
    mockEmitirStepUp.mockResolvedValue({ token: "token-dev" });

    const input = createInput({ isDev: true });
    const result = await requestExportStepUp(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.enviado).toBe(true);
      expect(result.link).toBe("https://albora.app/admin/e/evt-123/album?exportar=token-dev");
    }
  });

  it("deve rejeitar quando plano não permite ZIP", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("basico");
    mockPodeBaixarZip.mockReturnValue(false);

    const input = createInput();
    const result = await requestExportStepUp(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plano.zip");
      expect(result.message).toContain("plano Completo");
    }

    expect(mockEmitirStepUp).not.toHaveBeenCalled();
    expect(mockSendHostEmail).not.toHaveBeenCalled();
  });

  it("deve calcular expiresAt corretamente", async () => {
    const beforeCall = Date.now();
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("completo");
    mockPodeBaixarZip.mockReturnValue(true);
    mockEmitirStepUp.mockResolvedValue({ token: "token" });

    const input = createInput();
    await requestExportStepUp(input, mockPool);

    const callArgs = mockEmitirStepUp.mock.calls[0]!;
    const expiresAt = callArgs[3] as Date;
    const expectedMs = VALIDADE_STEP_UP_MINUTOS * 60 * 1000;
    const diff = expiresAt.getTime() - beforeCall;

    expect(diff).toBeGreaterThanOrEqual(expectedMs - 100);
    expect(diff).toBeLessThanOrEqual(expectedMs + 100);
  });

  it("deve incluir link no corpo do e-mail", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockPlanoDoEvento.mockResolvedValue("completo");
    mockPodeBaixarZip.mockReturnValue(true);
    mockEmitirStepUp.mockResolvedValue({ token: "token-xyz" });

    const input = createInput();
    await requestExportStepUp(input, mockPool);

    const emailCall = mockSendHostEmail.mock.calls[0]![0];
    expect(emailCall.text).toContain("https://albora.app/admin/e/evt-123/album?exportar=token-xyz");
    expect(emailCall.text).toContain("15 minutos");
  });
});
