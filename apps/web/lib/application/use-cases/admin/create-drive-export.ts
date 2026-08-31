/**
 * Use Case: Create or Resume Drive Export
 *
 * Cria novo job ou retoma job parcial de exportação para Google Drive.
 */
import {
  conexaoDrive,
  criarJobExportDrive,
  jobExportDriveMaisRecente,
  jobExportPorId,
  marcarDriveExpirado,
  previaExportDrive,
  refreshTokenDoEvento,
  retomarExportDrive,
  type JobExport,
} from "@albora/db";
import type { DriveTokenVault } from "@albora/core";
import type { Pool } from "pg";
import { getDriveClient } from "@/lib/drive";
import { driveFolderUrl } from "@/lib/drive-export";
import { scheduleDriveExportProcessing } from "@/lib/drive-export-scheduler";

export type DriveExportJobScreen = {
  id: string;
  estado: string;
  fotos: number;
  enviadas: number;
  bytesTotal: number;
  bytesEnviados: number;
  abrirNoDrive: string | null;
};

function telaDoJobDrive(job: JobExport): DriveExportJobScreen {
  return {
    id: job.id,
    estado: job.estado,
    fotos: job.fotos,
    enviadas: job.itens.filter((i) => i.uploadedAt).length,
    bytesTotal: job.bytesTotal,
    bytesEnviados: job.bytesEnviados,
    abrirNoDrive: job.driveFolderId ? driveFolderUrl(job.driveFolderId) : null,
  };
}

function jobTemPendentes(job: JobExport): boolean {
  return job.itens.some((i) => !i.uploadedAt);
}

function agendar(
  pool: Pool,
  eventId: string,
  accountId: string,
  jobId: string,
  hostEmail: string,
) {
  void scheduleDriveExportProcessing(pool, { eventId, jobId, accountId }, hostEmail);
}

export type CreateDriveExportInput = {
  eventId: string;
  accountId: string;
  hostEmail: string;
  eventoTerminaEm: Date;
};

export type CreateDriveExportResult =
  | {
      ok: true;
      job: DriveExportJobScreen;
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };

export async function createOrResumeDriveExport(
  input: CreateDriveExportInput,
  pool: Pool,
  vault: DriveTokenVault,
): Promise<CreateDriveExportResult> {
  if (Date.now() < input.eventoTerminaEm.getTime()) {
    return {
      ok: false,
      code: "drive.evento_nao_terminou",
      message: "Disponível depois que a festa terminar",
    };
  }

  const conexao = await conexaoDrive(pool, input.eventId);
  if (!conexao || conexao.status !== "conectado") {
    return {
      ok: false,
      code: "drive.nao_conectado",
      message: "Conecte o Google Drive primeiro",
    };
  }

  const existente = await jobExportDriveMaisRecente(pool, input.accountId, input.eventId);
  if (existente?.estado === "enviando") {
    return { ok: true, job: telaDoJobDrive(existente) };
  }

  if (existente?.estado === "parcial" && jobTemPendentes(existente)) {
    await retomarExportDrive(pool, input.eventId, existente.id);
    const retomado =
      (await jobExportPorId(pool, input.accountId, input.eventId, existente.id)) ?? existente;
    agendar(pool, input.eventId, input.accountId, retomado.id, input.hostEmail);
    return { ok: true, job: telaDoJobDrive({ ...retomado, estado: "enviando" }) };
  }

  const previa = await previaExportDrive(pool, input.accountId, input.eventId);
  if (!previa) {
    return {
      ok: false,
      code: "evento.nao_encontrado",
      message: "Evento não encontrado",
    };
  }

  const refreshToken = await refreshTokenDoEvento(pool, vault, input.eventId);
  if (!refreshToken) {
    return {
      ok: false,
      code: "drive.nao_conectado",
      message: "Conecte o Google Drive primeiro",
    };
  }

  const client = getDriveClient();
  try {
    await client.refreshAccessToken(refreshToken);
  } catch {
    await marcarDriveExpirado(pool, input.eventId);
    return {
      ok: false,
      code: "drive.expirado",
      message: "Reconecte o Google Drive",
    };
  }

  if (previa.bytesTotal > 0) {
    const accessToken = (await client.refreshAccessToken(refreshToken)).accessToken;
    const about = await client.getAbout(accessToken);
    const disponivel =
      about.quota.limitBytes === null
        ? Number.POSITIVE_INFINITY
        : about.quota.limitBytes - about.quota.usageBytes;

    if (disponivel < previa.bytesTotal) {
      console.log("drive_export_quota_exceeded", { eventId: input.eventId });
      return {
        ok: false,
        code: "drive.quota_insuficiente",
        message: "Seu Drive não tem espaço suficiente para o álbum",
        details: {
          necessario: previa.bytesTotal,
          disponivel: Math.max(0, Math.floor(disponivel)),
        },
      };
    }
  }

  const job = await criarJobExportDrive(
    pool,
    input.accountId,
    input.eventId,
    conexao.driveFolderId,
  );
  if (!job) {
    return {
      ok: false,
      code: "evento.nao_encontrado",
      message: "Evento não encontrado",
    };
  }

  console.log("drive_export_start", { eventId: input.eventId, fotos: job.fotos, async: true });

  if (job.estado === "enviando") {
    agendar(pool, input.eventId, input.accountId, job.id, input.hostEmail);
  }

  return { ok: true, job: telaDoJobDrive(job) };
}
