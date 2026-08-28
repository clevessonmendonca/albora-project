/**
 * Testes: Process Drive Export Use Case
 * 
 * Cobertura:
 * - processDriveExport modo "tick": processa job específico
 * - processDriveExport modo "sweep": varre jobs pendentes
 * - parseDriveExportMessage: valida e parseia mensagens
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { processDriveExport, parseDriveExportMessage } from "./process-drive-export";
import type { Pool } from "pg";
import type { DriveExportTickMessage } from "@/lib/drive-export-queue";

// Mocks usando vi.hoisted
const {
  mockTickDriveExportJob,
  mockSweepDriveExportJobs,
  mockParseDriveExportTickMessage,
} = vi.hoisted(() => {
  return {
    mockTickDriveExportJob: vi.fn(),
    mockSweepDriveExportJobs: vi.fn(),
    mockParseDriveExportTickMessage: vi.fn(),
  };
});

vi.mock("@/lib/drive-export-scheduler", () => ({
  tickDriveExportJob: mockTickDriveExportJob,
  sweepDriveExportJobs: mockSweepDriveExportJobs,
}));

vi.mock("@/lib/drive-export-tick-message", () => ({
  parseDriveExportTickMessage: mockParseDriveExportTickMessage,
}));

describe("processDriveExport - modo tick", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createTickMessage = (overrides: Partial<DriveExportTickMessage> = {}): DriveExportTickMessage => ({
    eventId: "evt-123",
    jobId: "job-456",
    accountId: "acc-789",
    ...overrides,
  });

  it("deve processar tick e retornar resultado quando job fecha", async () => {
    const message = createTickMessage();
    mockTickDriveExportJob.mockResolvedValue({
      fechou: true,
      reenfileirado: false,
    });

    const result = await processDriveExport({ mode: "tick", message }, mockPool);

    expect(result.modo).toBe("tick");
    expect(result.resultado).toEqual({
      fechou: true,
      reenfileirado: false,
    });
    expect(mockTickDriveExportJob).toHaveBeenCalledWith(mockPool, message);
    expect(mockTickDriveExportJob).toHaveBeenCalledTimes(1);
  });

  it("deve processar tick e retornar resultado quando job não fecha", async () => {
    const message = createTickMessage({ jobId: "job-pending" });
    mockTickDriveExportJob.mockResolvedValue({
      fechou: false,
      reenfileirado: true,
    });

    const result = await processDriveExport({ mode: "tick", message }, mockPool);

    expect(result.modo).toBe("tick");
    expect(result.resultado).toEqual({
      fechou: false,
      reenfileirado: true,
    });
    expect(mockTickDriveExportJob).toHaveBeenCalledWith(mockPool, message);
  });

  it("deve processar tick com diferentes eventIds", async () => {
    const message = createTickMessage({ eventId: "evt-different" });
    mockTickDriveExportJob.mockResolvedValue({
      fechou: true,
      reenfileirado: false,
    });

    const result = await processDriveExport({ mode: "tick", message }, mockPool);

    expect(result.modo).toBe("tick");
    expect(mockTickDriveExportJob).toHaveBeenCalledWith(mockPool, {
      eventId: "evt-different",
      jobId: "job-456",
      accountId: "acc-789",
    });
  });

  it("deve processar tick com diferentes jobIds", async () => {
    const message = createTickMessage({ jobId: "job-xyz" });
    mockTickDriveExportJob.mockResolvedValue({
      fechou: false,
      reenfileirado: false,
    });

    const result = await processDriveExport({ mode: "tick", message }, mockPool);

    expect(result.modo).toBe("tick");
    expect(result.resultado.fechou).toBe(false);
    expect(result.resultado.reenfileirado).toBe(false);
  });

  it("deve propagar erro do tickDriveExportJob", async () => {
    const message = createTickMessage();
    const error = new Error("Drive API falhou");
    mockTickDriveExportJob.mockRejectedValue(error);

    await expect(
      processDriveExport({ mode: "tick", message }, mockPool)
    ).rejects.toThrow("Drive API falhou");
  });

  it("deve processar tick com diferentes accountIds", async () => {
    const message = createTickMessage({ accountId: "acc-new" });
    mockTickDriveExportJob.mockResolvedValue({
      fechou: true,
      reenfileirado: false,
    });

    const result = await processDriveExport({ mode: "tick", message }, mockPool);

    expect(result.modo).toBe("tick");
    expect(mockTickDriveExportJob).toHaveBeenCalledWith(mockPool, {
      eventId: "evt-123",
      jobId: "job-456",
      accountId: "acc-new",
    });
  });
});

describe("processDriveExport - modo sweep", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  it("deve processar sweep e retornar resultado com jobs processados", async () => {
    mockSweepDriveExportJobs.mockResolvedValue({
      ticks: 5,
      fechados: 3,
    });

    const result = await processDriveExport({ mode: "sweep" }, mockPool);

    expect(result.modo).toBe("sweep");
    if (result.modo === "sweep") {
      expect(result.ticks).toBe(5);
      expect(result.fechados).toBe(3);
    }
    expect(mockSweepDriveExportJobs).toHaveBeenCalledWith(mockPool);
    expect(mockSweepDriveExportJobs).toHaveBeenCalledTimes(1);
  });

  it("deve processar sweep quando não há jobs pendentes", async () => {
    mockSweepDriveExportJobs.mockResolvedValue({
      ticks: 0,
      fechados: 0,
    });

    const result = await processDriveExport({ mode: "sweep" }, mockPool);

    expect(result.modo).toBe("sweep");
    if (result.modo === "sweep") {
      expect(result.ticks).toBe(0);
      expect(result.fechados).toBe(0);
    }
  });

  it("deve processar sweep com muitos jobs pendentes", async () => {
    mockSweepDriveExportJobs.mockResolvedValue({
      ticks: 20,
      fechados: 15,
    });

    const result = await processDriveExport({ mode: "sweep" }, mockPool);

    expect(result.modo).toBe("sweep");
    if (result.modo === "sweep") {
      expect(result.ticks).toBe(20);
      expect(result.fechados).toBe(15);
    }
  });

  it("deve processar sweep quando todos os jobs fecham", async () => {
    mockSweepDriveExportJobs.mockResolvedValue({
      ticks: 10,
      fechados: 10,
    });

    const result = await processDriveExport({ mode: "sweep" }, mockPool);

    expect(result.modo).toBe("sweep");
    if (result.modo === "sweep") {
      expect(result.ticks).toBe(10);
      expect(result.fechados).toBe(10);
      expect(result.ticks).toBe(result.fechados);
    }
  });

  it("deve processar sweep quando nenhum job fecha", async () => {
    mockSweepDriveExportJobs.mockResolvedValue({
      ticks: 8,
      fechados: 0,
    });

    const result = await processDriveExport({ mode: "sweep" }, mockPool);

    expect(result.modo).toBe("sweep");
    if (result.modo === "sweep") {
      expect(result.ticks).toBe(8);
      expect(result.fechados).toBe(0);
    }
  });

  it("deve propagar erro do sweepDriveExportJobs", async () => {
    const error = new Error("Erro ao varrer jobs");
    mockSweepDriveExportJobs.mockRejectedValue(error);

    await expect(
      processDriveExport({ mode: "sweep" }, mockPool)
    ).rejects.toThrow("Erro ao varrer jobs");
  });
});

describe("parseDriveExportMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve parsear mensagem válida", () => {
    const validMessage = {
      eventId: "evt-123",
      jobId: "job-456",
      accountId: "acc-789",
    };
    mockParseDriveExportTickMessage.mockReturnValue(validMessage);

    const result = parseDriveExportMessage(validMessage);

    expect(result).toEqual(validMessage);
    expect(mockParseDriveExportTickMessage).toHaveBeenCalledWith(validMessage);
  });

  it("deve retornar null para mensagem inválida", () => {
    const invalidMessage = {
      eventId: "not-a-uuid",
      jobId: "invalid",
    };
    mockParseDriveExportTickMessage.mockReturnValue(null);

    const result = parseDriveExportMessage(invalidMessage);

    expect(result).toBeNull();
    expect(mockParseDriveExportTickMessage).toHaveBeenCalledWith(invalidMessage);
  });

  it("deve retornar null para objeto vazio", () => {
    mockParseDriveExportTickMessage.mockReturnValue(null);

    const result = parseDriveExportMessage({});

    expect(result).toBeNull();
  });

  it("deve retornar null para mensagem com campos faltando", () => {
    const incompleteMessage = {
      eventId: "evt-123",
      jobId: "job-456",
    };
    mockParseDriveExportTickMessage.mockReturnValue(null);

    const result = parseDriveExportMessage(incompleteMessage);

    expect(result).toBeNull();
  });

  it("deve delegar validação completa para parseDriveExportTickMessage", () => {
    const message = {
      eventId: "12345678-1234-1234-1234-123456789012",
      jobId: "87654321-4321-4321-4321-210987654321",
      accountId: "abcdef01-2345-6789-abcd-ef0123456789",
    };
    mockParseDriveExportTickMessage.mockReturnValue(message);

    const result = parseDriveExportMessage(message);

    expect(result).toEqual(message);
    expect(mockParseDriveExportTickMessage).toHaveBeenCalledTimes(1);
  });
});
