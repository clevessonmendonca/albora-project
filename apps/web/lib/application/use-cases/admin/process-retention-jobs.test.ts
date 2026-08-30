/**
 * Testes do Use Case: Process Retention Jobs
 * 
 * Conformidade LGPD: export automático (d330), avisos (d358), delete definitivo (d365).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { processRetentionJobs } from "./process-retention-jobs";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockListDueRetentionJobs,
  mockProcessRetentionJob,
  mockDriveConfig,
  mockGetDriveClient,
  mockGetDriveVault,
  mockDeleteObject,
  mockSendHostEmail,
} = vi.hoisted(() => ({
  mockListDueRetentionJobs: vi.fn(),
  mockProcessRetentionJob: vi.fn(),
  mockDriveConfig: vi.fn(),
  mockGetDriveClient: vi.fn(),
  mockGetDriveVault: vi.fn(),
  mockDeleteObject: vi.fn(),
  mockSendHostEmail: vi.fn(),
}));

// Configuração de mocks
vi.mock("@albora/db", () => ({
  listDueRetentionJobs: mockListDueRetentionJobs,
  processRetentionJob: mockProcessRetentionJob,
}));

vi.mock("@/lib/drive-config", () => ({
  driveConfig: mockDriveConfig,
}));

vi.mock("@/lib/drive", () => ({
  getDriveClient: mockGetDriveClient,
  getDriveVault: mockGetDriveVault,
}));

vi.mock("@/lib/r2", () => ({
  deleteObject: mockDeleteObject,
}));

vi.mock("@/lib/email", () => ({
  sendHostEmail: mockSendHostEmail,
}));

// Helper para criar mock de Pool
function createMockPool(): Pool {
  return {} as Pool;
}

describe("processRetentionJobs", () => {
  let pool: Pool;
  let aggregatorPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    pool = createMockPool();
    aggregatorPool = createMockPool();

    // Defaults para Drive não configurado
    mockDriveConfig.mockImplementation(() => {
      throw new Error("Drive not configured");
    });
  });

  describe("Cenários sem jobs", () => {
    it("deve retornar zeros quando não há jobs", async () => {
      mockListDueRetentionJobs.mockResolvedValue([]);

      const result = await processRetentionJobs(pool, aggregatorPool);

      expect(result).toEqual({
        jobs: 0,
        processados: 0,
        ignorados: 0,
        erros: 0,
      });
      expect(mockListDueRetentionJobs).toHaveBeenCalledWith(aggregatorPool);
    });
  });

  describe("d330_drive: Export automático", () => {
    it("deve processar job d330_drive e enviar e-mail de aviso", async () => {
      const job = {
        id: "job-1",
        eventId: "evt-123",
        kind: "d330_drive" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      
      // Simular callback notify sendo chamado
      mockProcessRetentionJob.mockImplementation(async (_pool, _job, options) => {
        if (options.notify) {
          await options.notify({
            kind: "d330_drive",
            email: "host@example.com",
          });
        }
        return { status: "done" };
      });

      const result = await processRetentionJobs(pool, aggregatorPool);

      expect(result).toEqual({
        jobs: 1,
        processados: 1,
        ignorados: 0,
        erros: 0,
      });

      expect(mockProcessRetentionJob).toHaveBeenCalledWith(pool, job, {
        notify: expect.any(Function),
      });

      expect(mockSendHostEmail).toHaveBeenCalledWith({
        to: "host@example.com",
        subject: "Baixe o álbum antes que ele seja apagado",
        text: expect.stringContaining("Suas fotos estão salvas no Albora há um ano"),
      });
    });

    it("deve passar vault quando Drive estiver configurado", async () => {
      const mockVault = { clientId: "test", clientSecret: "secret" };
      mockDriveConfig.mockReturnValue({ clientId: "test" });
      mockGetDriveVault.mockReturnValue(mockVault);

      const job = {
        id: "job-1",
        eventId: "evt-123",
        kind: "d330_drive" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      mockProcessRetentionJob.mockResolvedValue({ status: "done" });

      await processRetentionJobs(pool, aggregatorPool);

      expect(mockProcessRetentionJob).toHaveBeenCalledWith(pool, job, {
        notify: expect.any(Function),
        vault: mockVault,
      });
    });
  });

  describe("d358_warn: Aviso de exclusão iminente", () => {
    it("deve processar job d358_warn e enviar e-mail de aviso", async () => {
      const job = {
        id: "job-2",
        eventId: "evt-456",
        kind: "d358_warn" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      
      // Simular callback notify sendo chamado
      mockProcessRetentionJob.mockImplementation(async (_pool, _job, options) => {
        if (options.notify) {
          await options.notify({
            kind: "d358_warn",
            email: "host@example.com",
            diasRestantes: 7,
          });
        }
        return { status: "done" };
      });

      const result = await processRetentionJobs(pool, aggregatorPool);

      expect(result).toEqual({
        jobs: 1,
        processados: 1,
        ignorados: 0,
        erros: 0,
      });

      expect(mockSendHostEmail).toHaveBeenCalledWith({
        to: "host@example.com",
        subject: "Atenção: suas fotos serão apagadas em 7 dias",
        text: expect.stringContaining("Faltam 7 dias"),
      });
    });

    it("deve usar singular quando restar 1 dia", async () => {
      const job = {
        id: "job-3",
        eventId: "evt-789",
        kind: "d358_warn" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      
      // Simular callback notify sendo chamado
      mockProcessRetentionJob.mockImplementation(async (_pool, _job, options) => {
        if (options.notify) {
          await options.notify({
            kind: "d358_warn",
            email: "host@example.com",
            diasRestantes: 1,
          });
        }
        return { status: "done" };
      });

      await processRetentionJobs(pool, aggregatorPool);

      expect(mockSendHostEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Faltam 1 dia"),
        }),
      );
    });
  });

  describe("d365_delete: Exclusão definitiva", () => {
    it("deve processar job d365_delete sem enviar e-mail", async () => {
      const job = {
        id: "job-4",
        eventId: "evt-delete",
        kind: "d365_delete" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      mockProcessRetentionJob.mockResolvedValue({
        status: "done",
        notificacao: {
          kind: "d365_skip",
        },
      });

      const result = await processRetentionJobs(pool, aggregatorPool);

      expect(result).toEqual({
        jobs: 1,
        processados: 1,
        ignorados: 0,
        erros: 0,
      });

      // d365_skip não envia e-mail
      expect(mockSendHostEmail).not.toHaveBeenCalled();
    });

    it("deve apagar chaves do R2 após commit", async () => {
      const job = {
        id: "job-5",
        eventId: "evt-purge",
        kind: "d365_delete" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      mockProcessRetentionJob.mockResolvedValue({
        status: "done",
        chavesParaApagar: [
          "events/evt-purge/uploads/photo1/full",
          "events/evt-purge/uploads/photo2/full",
        ],
      });

      mockDeleteObject.mockResolvedValue(undefined);

      await processRetentionJobs(pool, aggregatorPool);

      expect(mockDeleteObject).toHaveBeenCalledTimes(2);
      expect(mockDeleteObject).toHaveBeenCalledWith("events/evt-purge/uploads/photo1/full");
      expect(mockDeleteObject).toHaveBeenCalledWith("events/evt-purge/uploads/photo2/full");
    });

    it("deve degradar graciosamente se purge R2 falhar", async () => {
      const job = {
        id: "job-6",
        eventId: "evt-fail",
        kind: "d365_delete" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      mockProcessRetentionJob.mockResolvedValue({
        status: "done",
        chavesParaApagar: ["events/evt-fail/uploads/photo1/full"],
      });

      mockDeleteObject.mockRejectedValue(new Error("R2 error"));

      const result = await processRetentionJobs(pool, aggregatorPool);

      // Job ainda é contado como processado (commit já ocorreu)
      expect(result.processados).toBe(1);
      expect(result.erros).toBe(0);
    });

    it("deve revogar refresh token do Drive após commit", async () => {
      const mockRevoke = vi.fn().mockResolvedValue(undefined);
      mockGetDriveClient.mockReturnValue({ revoke: mockRevoke });

      const job = {
        id: "job-7",
        eventId: "evt-revoke",
        kind: "d365_delete" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      mockProcessRetentionJob.mockResolvedValue({
        status: "done",
        driveRefreshTokenParaRevogar: "refresh-token-123",
      });

      await processRetentionJobs(pool, aggregatorPool);

      expect(mockRevoke).toHaveBeenCalledWith("refresh-token-123");
    });

    it("deve degradar graciosamente se revogação Drive falhar", async () => {
      const mockRevoke = vi.fn().mockRejectedValue(new Error("Drive revoke failed"));
      mockGetDriveClient.mockReturnValue({ revoke: mockRevoke });

      const job = {
        id: "job-8",
        eventId: "evt-revoke-fail",
        kind: "d365_delete" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      mockProcessRetentionJob.mockResolvedValue({
        status: "done",
        driveRefreshTokenParaRevogar: "refresh-token-123",
      });

      const result = await processRetentionJobs(pool, aggregatorPool);

      // Job ainda é contado como processado (commit já ocorreu)
      expect(result.processados).toBe(1);
      expect(result.erros).toBe(0);
    });
  });

  describe("Estados do job", () => {
    it("deve contar jobs aguardando como ignorados", async () => {
      const jobs = [
        { id: "job-1", eventId: "evt-1", kind: "d330_drive" as const },
        { id: "job-2", eventId: "evt-2", kind: "d358_warn" as const },
      ];

      mockListDueRetentionJobs.mockResolvedValue(jobs);
      mockProcessRetentionJob
        .mockResolvedValueOnce({ status: "aguardando" })
        .mockResolvedValueOnce({ status: "aguardando" });

      const result = await processRetentionJobs(pool, aggregatorPool);

      expect(result).toEqual({
        jobs: 2,
        processados: 0,
        ignorados: 2,
        erros: 0,
      });
    });

    it("deve contar jobs falhados como erros", async () => {
      const jobs = [
        { id: "job-1", eventId: "evt-1", kind: "d330_drive" as const },
        { id: "job-2", eventId: "evt-2", kind: "d365_delete" as const },
      ];

      mockListDueRetentionJobs.mockResolvedValue(jobs);
      mockProcessRetentionJob
        .mockResolvedValueOnce({ status: "failed", error: "Database error" })
        .mockResolvedValueOnce({ status: "failed", error: "Export failed" });

      const result = await processRetentionJobs(pool, aggregatorPool);

      expect(result).toEqual({
        jobs: 2,
        processados: 0,
        ignorados: 0,
        erros: 2,
      });
    });

    it("deve processar múltiplos jobs com estados mistos", async () => {
      const jobs = [
        { id: "job-1", eventId: "evt-1", kind: "d330_drive" as const },
        { id: "job-2", eventId: "evt-2", kind: "d358_warn" as const },
        { id: "job-3", eventId: "evt-3", kind: "d365_delete" as const },
        { id: "job-4", eventId: "evt-4", kind: "d330_drive" as const },
      ];

      mockListDueRetentionJobs.mockResolvedValue(jobs);
      mockProcessRetentionJob
        .mockResolvedValueOnce({ status: "done" }) // job-1: sucesso
        .mockResolvedValueOnce({ status: "aguardando" }) // job-2: aguardando
        .mockResolvedValueOnce({ status: "failed", error: "Error" }) // job-3: erro
        .mockResolvedValueOnce({ status: "done" }); // job-4: sucesso

      const result = await processRetentionJobs(pool, aggregatorPool);

      expect(result).toEqual({
        jobs: 4,
        processados: 2,
        ignorados: 1,
        erros: 1,
      });
    });
  });

  describe("Isolamento de eventos", () => {
    it("deve usar aggregatorPool para listagem (BYPASSRLS)", async () => {
      mockListDueRetentionJobs.mockResolvedValue([]);

      await processRetentionJobs(pool, aggregatorPool);

      expect(mockListDueRetentionJobs).toHaveBeenCalledWith(aggregatorPool);
    });

    it("deve usar pool normal para processamento (SET LOCAL)", async () => {
      const job = {
        id: "job-1",
        eventId: "evt-123",
        kind: "d330_drive" as const,
      };

      mockListDueRetentionJobs.mockResolvedValue([job]);
      mockProcessRetentionJob.mockResolvedValue({ status: "done" });

      await processRetentionJobs(pool, aggregatorPool);

      expect(mockProcessRetentionJob).toHaveBeenCalledWith(
        pool,
        job,
        expect.any(Object),
      );
    });
  });

  describe("Processamento em lote", () => {
    it("deve processar todos os jobs mesmo se alguns falharem", async () => {
      const jobs = [
        { id: "job-1", eventId: "evt-1", kind: "d365_delete" as const },
        { id: "job-2", eventId: "evt-2", kind: "d365_delete" as const },
        { id: "job-3", eventId: "evt-3", kind: "d365_delete" as const },
      ];

      mockListDueRetentionJobs.mockResolvedValue(jobs);
      mockProcessRetentionJob
        .mockResolvedValueOnce({
          status: "done",
          chavesParaApagar: ["key1"],
        })
        .mockResolvedValueOnce({ status: "failed", error: "DB error" })
        .mockResolvedValueOnce({
          status: "done",
          chavesParaApagar: ["key3"],
        });

      mockDeleteObject.mockResolvedValue(undefined);

      const result = await processRetentionJobs(pool, aggregatorPool);

      expect(result).toEqual({
        jobs: 3,
        processados: 2,
        ignorados: 0,
        erros: 1,
      });

      // Purge R2 chamado apenas para jobs bem-sucedidos
      expect(mockDeleteObject).toHaveBeenCalledTimes(2);
      expect(mockDeleteObject).toHaveBeenCalledWith("key1");
      expect(mockDeleteObject).toHaveBeenCalledWith("key3");
    });
  });
});
