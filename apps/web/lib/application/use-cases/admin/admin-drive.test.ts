/**
 * Testes: Admin Drive Connection Use Cases
 * 
 * Cobertura:
 * - initiateDriveConnection: inicia OAuth flow
 * - completeDriveConnection: completa conexão
 * - disconnectDrive: desconecta e revoga
 * - getDriveConnectionStatus: status da conexão
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initiateDriveConnection } from "./initiate-drive-connection";
import { completeDriveConnection } from "./complete-drive-connection";
import { disconnectDrive } from "./disconnect-drive";
import { getDriveConnectionStatus } from "./get-drive-connection-status";
import type { Pool } from "pg";
import type { DriveClient } from "@/lib/drive-client";
import type { DriveTokenVault } from "@albora/core";

// Mocks usando vi.hoisted
const {
  mockConsumirStepUp,
  mockEmitirEstadoOAuthDrive,
  mockAbrirEstadoOAuthDrive,
  mockConectarDrive,
  mockRefreshTokenDoEvento,
  mockRevogarDrive,
  mockConexaoDrive,
  ErroMagicLinkInvalido,
  ErroDriveApi,
  ACAO_DRIVE_CONNECT,
  DRIVE_AUTH_ENDPOINT,
  DRIVE_SCOPE,
} = vi.hoisted(() => {
  class ErroMagicLinkInvalidoMock extends Error {
    motivo: string;
    constructor(motivo: string) {
      super(motivo);
      this.name = "ErroMagicLinkInvalido";
      this.motivo = motivo;
    }
  }

  class ErroDriveApiMock extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.name = "ErroDriveApi";
      this.code = code;
    }
  }

  return {
    mockConsumirStepUp: vi.fn(),
    mockEmitirEstadoOAuthDrive: vi.fn(),
    mockAbrirEstadoOAuthDrive: vi.fn(),
    mockConectarDrive: vi.fn(),
    mockRefreshTokenDoEvento: vi.fn(),
    mockRevogarDrive: vi.fn(),
    mockConexaoDrive: vi.fn(),
    ErroMagicLinkInvalido: ErroMagicLinkInvalidoMock,
    ErroDriveApi: ErroDriveApiMock,
    ACAO_DRIVE_CONNECT: "drive_connect",
    DRIVE_AUTH_ENDPOINT: "https://accounts.google.com/o/oauth2/v2/auth",
    DRIVE_SCOPE: "https://www.googleapis.com/auth/drive.file",
  };
});

vi.mock("@albora/db", () => ({
  consumirStepUp: mockConsumirStepUp,
  emitirEstadoOAuthDrive: mockEmitirEstadoOAuthDrive,
  abrirEstadoOAuthDrive: mockAbrirEstadoOAuthDrive,
  conectarDrive: mockConectarDrive,
  refreshTokenDoEvento: mockRefreshTokenDoEvento,
  revogarDrive: mockRevogarDrive,
  conexaoDrive: mockConexaoDrive,
  ErroMagicLinkInvalido,
}));

vi.mock("@albora/core", () => ({
  ACAO_DRIVE_CONNECT,
}));

vi.mock("@/lib/drive", () => ({
  DRIVE_AUTH_ENDPOINT,
  DRIVE_SCOPE,
}));

vi.mock("@/lib/drive-client", () => ({
  ErroDriveApi,
}));

describe("initiateDriveConnection", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    sessionSecret: "secret",
    confirmacao: "confirm-token",
    oauthClientId: "client-id",
    oauthStateSecret: "state-secret",
    requestOrigin: "https://albora.app",
    ...overrides,
  });

  it("deve iniciar conexão Drive com sucesso", async () => {
    mockConsumirStepUp.mockResolvedValue(undefined);
    mockEmitirEstadoOAuthDrive.mockReturnValue("state-abc123");

    const input = createInput();
    const result = await initiateDriveConnection(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toContain(DRIVE_AUTH_ENDPOINT);
      expect(result.redirectUrl).toContain("client_id=client-id");
      expect(result.redirectUrl).toContain("state=state-abc123");
      expect(result.redirectUrl).toContain("scope=");
      expect(result.redirectUrl).toContain("access_type=offline");
      expect(result.redirectUrl).toContain("prompt=consent");
    }

    expect(mockConsumirStepUp).toHaveBeenCalledWith(
      mockPool,
      "secret",
      "confirm-token",
      "acc-456",
      expect.any(Date),
      ACAO_DRIVE_CONNECT,
    );
    expect(mockEmitirEstadoOAuthDrive).toHaveBeenCalledWith(
      "state-secret",
      { eventId: "evt-123", accountId: "acc-456" },
    );
  });

  it("deve rejeitar step-up inválido", async () => {
    mockConsumirStepUp.mockRejectedValue(new ErroMagicLinkInvalido("expirado"));

    const input = createInput();
    const result = await initiateDriveConnection(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("admin.reauth_invalida");
      expect(result.message).toContain("inválida ou expirada");
    }
  });

  it("deve incluir redirect_uri correto", async () => {
    mockConsumirStepUp.mockResolvedValue(undefined);
    mockEmitirEstadoOAuthDrive.mockReturnValue("state-xyz");

    const input = createInput();
    const result = await initiateDriveConnection(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toContain(
        encodeURIComponent("https://albora.app/api/admin/events/evt-123/drive/callback"),
      );
    }
  });
});

describe("completeDriveConnection", () => {
  let mockPool: Pool;
  let mockClient: DriveClient;
  let mockVault: DriveTokenVault;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    mockClient = {
      exchangeCode: vi.fn(),
      createFolder: vi.fn(),
      getAbout: vi.fn(),
    } as unknown as DriveClient;
    mockVault = {} as DriveTokenVault;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    eventSlug: "maria-joao",
    code: "auth-code",
    state: "state-token",
    oauthStateSecret: "state-secret",
    requestOrigin: "https://albora.app",
    ...overrides,
  });

  it("deve completar conexão Drive com sucesso", async () => {
    mockAbrirEstadoOAuthDrive.mockReturnValue({
      eventId: "evt-123",
      accountId: "acc-456",
    });
    vi.mocked(mockClient.exchangeCode).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresInSeconds: 3600,
    });
    vi.mocked(mockClient.createFolder).mockResolvedValue({
      folderId: "folder-id",
    });
    vi.mocked(mockClient.getAbout).mockResolvedValue({
      email: "user@gmail.com",
      quota: { limitBytes: null, usageBytes: 0 },
    });
    mockConectarDrive.mockResolvedValue(undefined);

    const input = createInput();
    const result = await completeDriveConnection(input, mockPool, mockClient, mockVault);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toContain("/admin/e/evt-123/album");
      expect(result.redirectUrl).toContain("driveConectado=1");
    }

    expect(mockConectarDrive).toHaveBeenCalledWith(
      mockPool,
      mockVault,
      expect.objectContaining({
        eventId: "evt-123",
        accountId: "acc-456",
        driveFolderId: "folder-id",
        driveAccountEmail: "user@gmail.com",
        refreshToken: "refresh-token",
      }),
    );
  });

  it("deve rejeitar state inválido", async () => {
    mockAbrirEstadoOAuthDrive.mockReturnValue(null);

    const input = createInput();
    const result = await completeDriveConnection(input, mockPool, mockClient, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.state_invalido");
      expect(result.statusCode).toBe(409);
    }
  });

  it("deve rejeitar quando state não confere com evento", async () => {
    mockAbrirEstadoOAuthDrive.mockReturnValue({
      eventId: "evt-999",
      accountId: "acc-456",
    });

    const input = createInput();
    const result = await completeDriveConnection(input, mockPool, mockClient, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.state_invalido");
    }
  });

  it("deve rejeitar quando conta não confere", async () => {
    mockAbrirEstadoOAuthDrive.mockReturnValue({
      eventId: "evt-123",
      accountId: "acc-999",
    });

    const input = createInput();
    const result = await completeDriveConnection(input, mockPool, mockClient, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.conta_divergente");
      expect(result.statusCode).toBe(403);
    }
  });

  it("deve tratar erro da API do Drive", async () => {
    mockAbrirEstadoOAuthDrive.mockReturnValue({
      eventId: "evt-123",
      accountId: "acc-456",
    });
    vi.mocked(mockClient.exchangeCode).mockRejectedValue(new ErroDriveApi("invalid_grant"));

    const input = createInput();
    const result = await completeDriveConnection(input, mockPool, mockClient, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.conexao_falhou");
      expect(result.statusCode).toBe(502);
    }
  });
});

describe("disconnectDrive", () => {
  let mockPool: Pool;
  let mockClient: DriveClient;
  let mockVault: DriveTokenVault;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    mockClient = {
      revoke: vi.fn(),
    } as unknown as DriveClient;
    mockVault = {} as DriveTokenVault;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    ...overrides,
  });

  it("deve desconectar Drive com sucesso", async () => {
    mockRefreshTokenDoEvento.mockResolvedValue("refresh-token");
    vi.mocked(mockClient.revoke).mockResolvedValue(undefined);
    mockRevogarDrive.mockResolvedValue(undefined);

    const input = createInput();
    const result = await disconnectDrive(input, mockPool, mockClient, mockVault);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.desconectado).toBe(true);
    }

    expect(mockClient.revoke).toHaveBeenCalledWith("refresh-token");
    expect(mockRevogarDrive).toHaveBeenCalledWith(mockPool, "evt-123");
  });

  it("deve rejeitar quando não há conexão", async () => {
    mockRefreshTokenDoEvento.mockResolvedValue(null);

    const input = createInput();
    const result = await disconnectDrive(input, mockPool, mockClient, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.nao_conectado");
    }

    expect(mockClient.revoke).not.toHaveBeenCalled();
    expect(mockRevogarDrive).not.toHaveBeenCalled();
  });

  it("deve continuar mesmo se revoke falhar", async () => {
    mockRefreshTokenDoEvento.mockResolvedValue("refresh-token");
    vi.mocked(mockClient.revoke).mockRejectedValue(new ErroDriveApi("revoke_failed"));
    mockRevogarDrive.mockResolvedValue(undefined);

    const input = createInput();
    const result = await disconnectDrive(input, mockPool, mockClient, mockVault);

    expect(result.ok).toBe(true);
    expect(mockRevogarDrive).toHaveBeenCalled();
  });
});

describe("getDriveConnectionStatus", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    eventoTerminaEm: new Date("2026-09-01T22:00:00Z"),
    ...overrides,
  });

  it("deve retornar status conectado", async () => {
    mockConexaoDrive.mockResolvedValue({
      status: "connected",
      driveAccountEmail: "user@gmail.com",
      connectedAt: new Date("2026-08-01T10:00:00Z"),
    });

    const input = createInput();
    const result = await getDriveConnectionStatus(input, mockPool);

    expect(result.conexao).not.toBeNull();
    expect(result.conexao?.status).toBe("connected");
    expect(result.conexao?.email).toBe("user@gmail.com");
    expect(result.conexao?.conectadoEm).toBe("2026-08-01T10:00:00.000Z");
  });

  it("deve retornar null quando não conectado", async () => {
    mockConexaoDrive.mockResolvedValue(null);

    const input = createInput();
    const result = await getDriveConnectionStatus(input, mockPool);

    expect(result.conexao).toBeNull();
  });

  it("deve calcular podeExportar corretamente (evento passou)", async () => {
    mockConexaoDrive.mockResolvedValue(null);

    const input = createInput({
      eventoTerminaEm: new Date(Date.now() - 1000),
    });
    const result = await getDriveConnectionStatus(input, mockPool);

    expect(result.podeExportar).toBe(true);
  });

  it("deve calcular podeExportar corretamente (evento futuro)", async () => {
    mockConexaoDrive.mockResolvedValue(null);

    const input = createInput({
      eventoTerminaEm: new Date(Date.now() + 1000000),
    });
    const result = await getDriveConnectionStatus(input, mockPool);

    expect(result.podeExportar).toBe(false);
  });
});
