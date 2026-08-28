/**
 * Use Case: Get Latest Export Job
 *
 * Busca job de export mais recente do evento.
 */
import { jobExportMaisRecente, type JobExport } from "@albora/db";
import type { Pool } from "pg";

export type GetLatestExportJobInput = {
  eventId: string;
  accountId: string;
  modo?: "full" | "curated";
};

export type GetLatestExportJobOutput = {
  job: {
    id: string;
    estado: string;
    modo: string;
    fotos: number;
    criadoEm: string;
    baixar: string | null;
  } | null;
};

function telaDoJob(eventId: string, job: JobExport) {
  return {
    id: job.id,
    estado: job.estado,
    modo: job.modo,
    fotos: job.fotos,
    criadoEm: job.criadoEm.toISOString(),
    baixar: job.estado === "pronto" ? `/api/admin/events/${eventId}/export/arquivo?job=${job.id}` : null,
  };
}

export async function getLatestExportJob(
  input: GetLatestExportJobInput,
  pool: Pool,
): Promise<GetLatestExportJobOutput> {
  const job = await jobExportMaisRecente(pool, input.accountId, input.eventId, input.modo);
  return { job: job ? telaDoJob(input.eventId, job) : null };
}
