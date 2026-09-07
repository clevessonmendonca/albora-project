/**
 * Use Case: Get Latest Drive Export Job
 *
 * Busca job de exportação Drive mais recente do evento.
 */
import { jobExportDriveMaisRecente } from "@albora/db";
import type { Pool } from "pg";
import type { DriveExportJobScreen } from "./create-drive-export";
import { driveFolderUrl } from "@/lib/drive-export";

export type GetDriveExportInput = {
  eventId: string;
  accountId: string;
};

export type GetDriveExportOutput = {
  job: DriveExportJobScreen | null;
};

export async function getLatestDriveExport(
  input: GetDriveExportInput,
  pool: Pool,
): Promise<GetDriveExportOutput> {
  const job = await jobExportDriveMaisRecente(pool, input.accountId, input.eventId);

  if (!job) {
    return { job: null };
  }

  return {
    job: {
      id: job.id,
      estado: job.estado,
      fotos: job.fotos,
      enviadas: job.itens.filter((i) => i.uploadedAt).length,
      bytesTotal: job.bytesTotal,
      bytesEnviados: job.bytesEnviados,
      abrirNoDrive: job.driveFolderId ? driveFolderUrl(job.driveFolderId) : null,
    },
  };
}
