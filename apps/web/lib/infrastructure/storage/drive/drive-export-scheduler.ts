import type { Pool } from "pg";
import { listarJobsDriveEnviando } from "@albora/db";
import { getDriveClient, getDriveVault } from "@/lib/drive";
import { driveFolderUrl } from "@/lib/drive-export";
import { enqueueDriveExportTick, type DriveExportTickMessage } from "@/lib/drive-export-queue";
import { processDriveExportJob, processDriveExportJobAteFechar, type DriveExportWorkerDeps } from "@/lib/drive-export-worker";
import { sendHostEmail } from "@/lib/email";

async function emailDoEvento(pool: Pool, eventId: string): Promise<string | null> {
  const { rows } = await pool.query<{ email: string }>(
    "SELECT a.email FROM events e JOIN accounts a ON a.id = e.account_id WHERE e.id = $1",
    [eventId],
  );
  return rows[0]?.email ?? null;
}

function depsDoWorker(hostEmail: string | null): DriveExportWorkerDeps {
  const base: DriveExportWorkerDeps = {
    driveClient: getDriveClient(),
    vault: getDriveVault(),
  };
  if (!hostEmail) return base;
  return {
    ...base,
    onPronto: async ({ total, job }) => {
      void sendHostEmail({
        to: hostEmail,
        subject: "Suas fotos já estão no Google Drive",
        text: [
          `${total} ${total === 1 ? "arquivo foi enviado" : "arquivos foram enviados"} para o Drive de vocês.`,
          "",
          job.driveFolderId ? driveFolderUrl(job.driveFolderId) : "",
        ].join("\n"),
      });
    },
  };
}

/** Um tick — re-enfileira se ainda há itens pendentes. */
export async function tickDriveExportJob(
  pool: Pool,
  message: DriveExportTickMessage,
): Promise<{ fechou: boolean; reenfileirado: boolean }> {
  const email = await emailDoEvento(pool, message.eventId);
  const fechou = await processDriveExportJob(
    pool,
    message.eventId,
    message.accountId,
    message.jobId,
    depsDoWorker(email),
  );

  if (!fechou) {
    const canal = await enqueueDriveExportTick(message);
    if (canal === "local") {
      void processDriveExportJobAteFechar(
        pool,
        message.eventId,
        message.accountId,
        message.jobId,
        depsDoWorker(email),
      ).catch((e) => {
        console.error("drive_export.background_falhou", { ...message, erro: String(e) });
      });
    } else {
      console.log("drive_export.tick_pendente", { ...message, canal });
    }
    return { fechou: false, reenfileirado: canal !== "local" };
  }

  return { fechou: true, reenfileirado: false };
}

/** Varredura cross-event — um tick por job `enviando` (cron / `pnpm drive-export`). */
export async function sweepDriveExportJobs(pool: Pool, limite = 20): Promise<{ ticks: number; fechados: number }> {
  const jobs = await listarJobsDriveEnviando(pool, limite);
  let fechados = 0;
  for (const job of jobs) {
    const { fechou } = await tickDriveExportJob(pool, job);
    if (fechou) fechados += 1;
  }
  return { ticks: jobs.length, fechados };
}

/** Agenda processamento após POST do admin: fila/HTTP em prod, background no dev server sem binding nem APP_URL. */
export async function scheduleDriveExportProcessing(
  pool: Pool,
  message: DriveExportTickMessage,
  hostEmail: string,
): Promise<void> {
  const canal = await enqueueDriveExportTick(message);
  if (canal !== "local") {
    console.log("drive_export.agendado", { ...message, canal });
    return;
  }

  void processDriveExportJobAteFechar(
    pool,
    message.eventId,
    message.accountId,
    message.jobId,
    depsDoWorker(hostEmail),
  ).catch((e) => {
    console.error("drive_export.background_falhou", { ...message, erro: String(e) });
  });
}
