import { errorResponse, jsonOk, requireDriveConfig, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { processDriveExport, parseDriveExportMessage } from "@/lib/application/use-cases/admin";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.JOB_RUNNER_SECRET;
  if (!secret) return process.env.APP_ENV === "dev";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Consumer HTTP da fila/cron do export Drive (spec §9): `Authorization: Bearer $JOB_RUNNER_SECRET`; em dev sem segredo, só localhost. */
export async function postJobsDriveExport(req: Request) {
  if (!autorizado(req)) {
    return errorResponse(401, "job.nao_autorizado", "Não autorizado");
  }

  const cfgErr = requireDriveConfig("jobs.drive-export");
  if (cfgErr) return cfgErr;

  try {
    const body: unknown = await req.json();
    const tick = isRecord(body) ? parseDriveExportMessage(body) : null;

    if (tick) {
      const resultado = await processDriveExport({ mode: "tick", message: tick }, getPool());
      return jsonOk(resultado);
    }

    const resultado = await processDriveExport({ mode: "sweep" }, getPool());
    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("jobs.drive_export", e);
  }
}
