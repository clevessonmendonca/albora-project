import {
  ADMIN_SESSION_REQUIRED,
  COUPLE_HOST_ROLES,
  errorResponse,
  jsonOk,
  requireConfig,
  requireDriveConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { getDriveVault } from "@/lib/drive";
import { consume } from "@/lib/rate-limit-store";
import {
  createOrResumeDriveExport,
  getLatestDriveExport,
} from "@/lib/application/use-cases/admin";

export const dynamic = "force-dynamic";

async function requireOwnedEvent(req: Request, eventId: string) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  if (!UUID_RE.test(eventId)) {
    return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const owned = await requireHostEventRole(auth.host.accountId, eventId, COUPLE_HOST_ROLES);
  if (owned instanceof Response) return owned;

  return { host: auth.host, evento: owned.evento };
}

/** Cria ou retoma job de Drive e devolve 202 — ticks via fila/cron/background. */
export async function postExportDrive(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const cfgErr = requireDriveConfig("admin.export.drive");
  if (cfgErr) return cfgErr;

  const limite = consume(`admin_export_drive:${auth.host.accountId}`, 4, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const resultado = await createOrResumeDriveExport(
      {
        eventId,
        accountId: auth.host.accountId,
        hostEmail: auth.host.email,
        eventoTerminaEm: auth.evento.terminaEm,
      },
      getPool(),
      getDriveVault(),
    );

    if (!resultado.ok) {
      const statusCode =
        resultado.code === "drive.evento_nao_terminou" ||
        resultado.code === "drive.nao_conectado" ||
        resultado.code === "drive.expirado" ||
        resultado.code === "drive.quota_insuficiente"
          ? 409
          : 404;
      return errorResponse(statusCode, resultado.code, resultado.message, resultado.details);
    }

    return jsonOk({ job: resultado.job }, { status: 202 });
  } catch (e) {
    return unexpectedError("admin.export.drive", e);
  }
}

export async function getExportDrive(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_export_drive_get:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const resultado = await getLatestDriveExport(
      { eventId, accountId: auth.host.accountId },
      getPool(),
    );
    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("admin.export.drive", e);
  }
}
