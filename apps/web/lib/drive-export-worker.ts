import type { DriveTokenVault } from "@albora/core";
import type { JobExport } from "@albora/db";
import {
  finalizarExportDrive,
  jobExportPorId,
  marcarDriveExpirado,
  marcarItemDriveEnviado,
  refreshTokenDoEvento,
} from "@albora/db";
import type { Pool } from "pg";
import type { DriveClient } from "./drive-client";
import { avancarExportDrive, driveFolderUrl, ITENS_POR_TICK_DRIVE, type LeitorDeObjeto } from "./drive-export";
import { streamObject } from "./r2";

export type DriveExportWorkerDeps = {
  driveClient: DriveClient;
  vault: DriveTokenVault;
  ler?: (chave: string) => Promise<LeitorDeObjeto | null>;
  maxItens?: number;
  onPronto?: (ctx: { eventId: string; job: JobExport; total: number }) => Promise<void>;
};

/**
 * Um tick de processamento do job `enviando` — chamado pelo runner cron ou em
 * background no dev server. Retorna `true` se o job fechou neste tick.
 */
export async function processDriveExportJob(
  pool: Pool,
  eventId: string,
  accountId: string,
  jobId: string,
  deps: DriveExportWorkerDeps,
): Promise<boolean> {
  const job = await jobExportPorId(pool, accountId, eventId, jobId);
  if (!job || job.estado !== "enviando" || job.destino !== "drive") return false;

  const refreshToken = await refreshTokenDoEvento(pool, deps.vault, eventId);
  if (!refreshToken) {
    await marcarDriveExpirado(pool, eventId);
    await finalizarExportDrive(pool, eventId, jobId, "parcial");
    return true;
  }

  let accessToken: string;
  try {
    accessToken = (await deps.driveClient.refreshAccessToken(refreshToken)).accessToken;
  } catch {
    await marcarDriveExpirado(pool, eventId);
    await finalizarExportDrive(pool, eventId, jobId, "parcial");
    return true;
  }

  const ler = deps.ler ?? ((chave: string) => streamObject(chave));
  const tick = await avancarExportDrive(
    job,
    deps.driveClient,
    accessToken,
    ler,
    (itemId, fileId) => marcarItemDriveEnviado(pool, eventId, jobId, itemId, fileId),
    { maxItens: deps.maxItens ?? ITENS_POR_TICK_DRIVE },
  );

  if (!tick.concluido) return false;

  await finalizarExportDrive(pool, eventId, jobId, tick.estado);
  if (tick.estado === "pronto" && deps.onPronto) {
    const fechado = await jobExportPorId(pool, accountId, eventId, jobId);
    if (fechado) await deps.onPronto({ eventId, job: fechado, total: tick.total });
  }

  console.log(tick.estado === "pronto" ? "drive_export_ok" : "drive_export_partial", {
    eventId,
    jobId,
    enviadas: tick.enviadas,
    total: tick.total,
    abrirNoDrive: job.driveFolderId ? driveFolderUrl(job.driveFolderId) : null,
  });

  return true;
}

/** Esvazia o job em ticks até fechar ou estourar `maxTicks` (proteção dev). */
export async function processDriveExportJobAteFechar(
  pool: Pool,
  eventId: string,
  accountId: string,
  jobId: string,
  deps: DriveExportWorkerDeps,
  maxTicks = 500,
): Promise<void> {
  for (let i = 0; i < maxTicks; i += 1) {
    const fechou = await processDriveExportJob(pool, eventId, accountId, jobId, deps);
    if (fechou) return;
  }
  console.warn("drive_export.max_ticks", { eventId, jobId, maxTicks });
}
