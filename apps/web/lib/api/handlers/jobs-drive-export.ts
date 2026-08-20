import { errorResponse, jsonOk, parseJsonBody, requireDriveConfig, unexpectedError, UUID_RE } from "@/lib/api";
import { getPool } from "@/lib/db";
import type { DriveExportTickMessage } from "@/lib/drive-export-queue";
import { sweepDriveExportJobs, tickDriveExportJob } from "@/lib/drive-export-scheduler";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.JOB_RUNNER_SECRET;
  if (!secret) return process.env.APP_ENV === "dev";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function parseTick(corpo: unknown): DriveExportTickMessage | null {
  if (!corpo || typeof corpo !== "object") return null;
  const c = corpo as Record<string, unknown>;
  if (
    typeof c.eventId !== "string" ||
    typeof c.jobId !== "string" ||
    typeof c.accountId !== "string" ||
    !UUID_RE.test(c.eventId) ||
    !UUID_RE.test(c.jobId) ||
    !UUID_RE.test(c.accountId)
  ) {
    return null;
  }
  return { eventId: c.eventId, jobId: c.jobId, accountId: c.accountId };
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

    const tick = parseTick(parsed.data);
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
