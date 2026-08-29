/**
 * Testes: Admin Drive Exports Use Cases
 * 
 * Cobertura:
 * - createOrResumeDriveExport: cria ou retoma export Drive
 * - getLatestDriveExport: busca último export Drive
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createOrResumeDriveExport } from "./create-drive-export";
import { getLatestDriveExport } from "./get-drive-export";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockConexaoDrive,
  mockJobExportDriveMaisRecente,
  mockRetomarExportDrive,
  mockJobExportPorId,
  mockPreviaExportDrive,
  mockRefreshTokenDoEvento,
  mockMarcarDriveExpirado,
  mockCriarJobExportDrive,
  mockGetDriveClient,
  mockGetDriveVault,
  mockScheduleDriveExportProcessing,
  mockDriveFolderUrl,
} = vi.hoisted(() => ({
  mockConexaoDrive: vi.fn(),
  mockJobExportDriveMaisRecente: vi.fn(),
  mockRetomarExportDrive: vi.fn(),
  mockJobExportPorId: vi.fn(),
  mockPreviaExportDrive: vi.fn(),
  mockRefreshTokenDoEvento: vi.fn(),
  mockMarcarDriveExpirado: vi.fn(),
  mockCriarJobExportDrive: vi.fn(),
  mockGetDriveClient: vi.fn(),
  mockGetDriveVault: vi.fn(),
  mockScheduleDriveExportProcessing: vi.fn(),
  mockDriveFolderUrl: vi.fn((id: string) => `https://drive.google.com/drive/folders/${id}`),
}));

vi.mock("@albora/db", () => ({
  conexaoDrive: mockConexaoDrive,
  jobExportDriveMaisRecente: mockJobExportDriveMaisRecente,
  retomarExportDrive: mockRetomarExportDrive,
  jobExportPorId: mockJobExportPorId,
  previaExportDrive: mockPreviaExportDrive,
  refreshTokenDoEvento: mockRefreshTokenDoEvento,
  marcarDriveExpirado: mockMarcarDriveExpirado,
  criarJobExportDrive: mockCriarJobExportDrive,
}));

vi.mock("@/lib/drive", () => ({
  getDriveClient: mockGetDriveClient,
  getDriveVault: mockGetDriveVault,
}));

vi.mock("@/lib/drive-export-scheduler", () => ({
  scheduleDriveExportProcessing: mockScheduleDriveExportProcessing,
}));

vi.mock("@/lib/drive-export", () => ({
  driveFolderUrl: mockDriveFolderUrl,
}));

describe("createOrResumeDriveExport", () => {
  let mockPool: Pool;
  let mockVault: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- mock do vault Drive
  let mockClient: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- mock do client Drive

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
    mockVault = {};
    mockClient = {
      refreshAccessToken: vi.fn(),
      getAbout: vi.fn(),
    };
    mockGetDriveClient.mockReturnValue(mockClient);
    mockGetDriveVault.mockReturnValue(mockVault);
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    hostEmail: "host@example.com",
    eventoTerminaEm: new Date(Date.now() - 1000),
    ...overrides,
  });

  it("deve rejeitar quando evento não terminou", async () => {
    const input = createInput({
      eventoTerminaEm: new Date(Date.now() + 100000),
    });

    const result = await createOrResumeDriveExport(input, mockPool, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.evento_nao_terminou");
    }
  });

  it("deve rejeitar quando Drive não conectado", async () => {
    mockConexaoDrive.mockResolvedValue(null);

    const input = createInput();
    const result = await createOrResumeDriveExport(input, mockPool, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.nao_conectado");
    }
  });

  it("deve retornar job existente quando enviando", async () => {
    mockConexaoDrive.mockResolvedValue({
      status: "conectado",
      driveFolderId: "folder-1",
    });
    mockJobExportDriveMaisRecente.mockResolvedValue({
      id: "job-1",
      estado: "enviando",
      fotos: 50,
      bytesTotal: 1000000,
      bytesEnviados: 500000,
      itens: [{ uploadedAt: new Date() }, { uploadedAt: null }],
      driveFolderId: "folder-1",
    });

    const input = createInput();
    const result = await createOrResumeDriveExport(input, mockPool, mockVault);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.id).toBe("job-1");
      expect(result.job.estado).toBe("enviando");
      expect(result.job.enviadas).toBe(1);
    }
  });

  it("deve retomar job parcial com pendentes", async () => {
    mockConexaoDrive.mockResolvedValue({
      status: "conectado",
      driveFolderId: "folder-1",
    });
    mockJobExportDriveMaisRecente.mockResolvedValue({
      id: "job-2",
      estado: "parcial",
      fotos: 10,
      bytesTotal: 100000,
      bytesEnviados: 50000,
      itens: [{ uploadedAt: new Date() }, { uploadedAt: null }],
      driveFolderId: "folder-1",
    });
    mockJobExportPorId.mockResolvedValue({
      id: "job-2",
      estado: "enviando",
      fotos: 10,
      bytesTotal: 100000,
      bytesEnviados: 50000,
      itens: [{ uploadedAt: new Date() }, { uploadedAt: null }],
      driveFolderId: "folder-1",
    });

    const input = createInput();
    const result = await createOrResumeDriveExport(input, mockPool, mockVault);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.estado).toBe("enviando");
    }
    expect(mockRetomarExportDrive).toHaveBeenCalled();
    expect(mockScheduleDriveExportProcessing).toHaveBeenCalled();
  });

  it("deve criar novo job quando não há job existente", async () => {
    mockConexaoDrive.mockResolvedValue({
      status: "conectado",
      driveFolderId: "folder-1",
      driveAccountEmail: "user@gmail.com",
      connectedAt: new Date(),
    });
    mockJobExportDriveMaisRecente.mockResolvedValue(null);
    mockPreviaExportDrive.mockResolvedValue({
      bytesTotal: 5000000,
    });
    mockRefreshTokenDoEvento.mockResolvedValue("refresh-token");
    mockClient.refreshAccessToken.mockResolvedValue({
      accessToken: "access-token",
    });
    mockClient.getAbout.mockResolvedValue({
      quota: {
        limitBytes: 15000000000,
        usageBytes: 10000000000,
      },
    });
    mockCriarJobExportDrive.mockResolvedValue({
      id: "job-new",
      estado: "enviando",
      fotos: 100,
      bytesTotal: 5000000,
      bytesEnviados: 0,
      itens: [],
      driveFolderId: "folder-1",
    });

    const input = createInput();
    const result = await createOrResumeDriveExport(input, mockPool, mockVault);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.id).toBe("job-new");
      expect(result.job.fotos).toBe(100);
    }
    expect(mockScheduleDriveExportProcessing).toHaveBeenCalled();
  });

  it("deve rejeitar quando quota insuficiente", async () => {
    mockConexaoDrive.mockResolvedValue({
      status: "conectado",
      driveFolderId: "folder-1",
    });
    mockJobExportDriveMaisRecente.mockResolvedValue(null);
    mockPreviaExportDrive.mockResolvedValue({
      bytesTotal: 5000000000,
    });
    mockRefreshTokenDoEvento.mockResolvedValue("refresh-token");
    mockClient.refreshAccessToken.mockResolvedValue({
      accessToken: "access-token",
    });
    mockClient.getAbout.mockResolvedValue({
      quota: {
        limitBytes: 15000000000,
        usageBytes: 14000000000,
      },
    });

    const input = createInput();
    const result = await createOrResumeDriveExport(input, mockPool, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.quota_insuficiente");
      expect(result.details).toBeDefined();
    }
  });

  it("deve marcar Drive como expirado quando refresh falha", async () => {
    mockConexaoDrive.mockResolvedValue({
      status: "conectado",
      driveFolderId: "folder-1",
    });
    mockJobExportDriveMaisRecente.mockResolvedValue(null);
    mockPreviaExportDrive.mockResolvedValue({
      bytesTotal: 1000,
    });
    mockRefreshTokenDoEvento.mockResolvedValue("refresh-token");
    mockClient.refreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

    const input = createInput();
    const result = await createOrResumeDriveExport(input, mockPool, mockVault);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("drive.expirado");
    }
    expect(mockMarcarDriveExpirado).toHaveBeenCalled();
  });
});

describe("getLatestDriveExport", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    ...overrides,
  });

  it("deve retornar job mais recente", async () => {
    mockJobExportDriveMaisRecente.mockResolvedValue({
      id: "job-1",
      estado: "pronto",
      fotos: 100,
      bytesTotal: 1000000,
      bytesEnviados: 1000000,
      itens: [
        { uploadedAt: new Date() },
        { uploadedAt: new Date() },
      ],
      driveFolderId: "folder-abc",
    });

    const input = createInput();
    const result = await getLatestDriveExport(input, mockPool);

    expect(result.job).not.toBeNull();
    expect(result.job?.id).toBe("job-1");
    expect(result.job?.estado).toBe("pronto");
    expect(result.job?.fotos).toBe(100);
    expect(result.job?.enviadas).toBe(2);
    expect(result.job?.abrirNoDrive).toBe("https://drive.google.com/drive/folders/folder-abc");
  });

  it("deve retornar null quando não há job", async () => {
    mockJobExportDriveMaisRecente.mockResolvedValue(null);

    const input = createInput();
    const result = await getLatestDriveExport(input, mockPool);

    expect(result.job).toBeNull();
  });

  it("deve calcular enviadas corretamente", async () => {
    mockJobExportDriveMaisRecente.mockResolvedValue({
      id: "job-2",
      estado: "enviando",
      fotos: 10,
      bytesTotal: 100000,
      bytesEnviados: 50000,
      itens: [
        { uploadedAt: new Date() },
        { uploadedAt: new Date() },
        { uploadedAt: new Date() },
        { uploadedAt: null },
        { uploadedAt: null },
      ],
      driveFolderId: "folder-xyz",
    });

    const input = createInput();
    const result = await getLatestDriveExport(input, mockPool);

    expect(result.job?.enviadas).toBe(3);
  });

  it("deve retornar null para abrirNoDrive quando não há folder", async () => {
    mockJobExportDriveMaisRecente.mockResolvedValue({
      id: "job-3",
      estado: "processando",
      fotos: 50,
      bytesTotal: 500000,
      bytesEnviados: 0,
      itens: [],
      driveFolderId: null,
    });

    const input = createInput();
    const result = await getLatestDriveExport(input, mockPool);

    expect(result.job?.abrirNoDrive).toBeNull();
  });
});
