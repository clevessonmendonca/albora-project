import { errorResponse, jsonOk, parseJsonBody, requireDriveConfig, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import type { DriveExportTickMessage } from "@/lib/drive-export-queue";
import { parseDriveExportTickMessage } from "@/lib/drive-export-tick-message";
import { sweepDriveExportJobs, tickDriveExportJob } from "@/lib/drive-export-scheduler";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.JOB_RUNNER_SECRET;
  if (!secret) return process.env.APP_ENV === "dev";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Consumer HTTP da fila / cron do export Drive (spec §9).
 * `Authorization: Bearer $JOB_RUNNER_SECRET` — em dev sem segredo, só localhost.
 */
export async function postJobsDriveExport(req: Request) {
  if (!autorizado(req)) {
    return errorResponse(401, "job.nao_autorizado", "Não autorizado");
  }

  const cfgErr = requireDriveConfig("jobs.drive-export");
  if (cfgErr) return cfgErr;

  try {
    const parsed = await parseJsonBody<DriveExportTickMessage | Record<string, never>>(req);
    if (parsed instanceof Response) return parsed;

    const tick = parseDriveExportTickMessage(parsed.data);
    if (tick) {
      const resultado = await tickDriveExportJob(getPool(), tick);
      return jsonOk({ modo: "tick", ...resultado });
    }

    const varredura = await sweepDriveExportJobs(getPool());
    return jsonOk({ modo: "sweep", ...varredura });
  } catch (e) {
    return unexpectedError("jobs.drive_export", e);
  }
}
