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
import { getDriveClient, getDriveVault } from "@/lib/drive";
import { driveFolderUrl } from "@/lib/drive-export";
import { scheduleDriveExportProcessing } from "@/lib/drive-export-scheduler";
import { consume } from "@/lib/rate-limit-store";

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

function telaDoJobDrive(job: JobExport) {
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

function agendar(eventId: string, accountId: string, jobId: string, hostEmail: string) {
  void scheduleDriveExportProcessing(getPool(), { eventId, jobId, accountId }, hostEmail);
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

  if (Date.now() < auth.evento.terminaEm.getTime()) {
    return errorResponse(
      403,
      "drive.evento_nao_terminou",
      "Disponível depois que a festa terminar",
    );
  }

  const limite = consume(`admin_export_drive:${auth.host.accountId}`, 4, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const conexao = await conexaoDrive(getPool(), eventId);
    if (!conexao || conexao.status !== "conectado") {
      return errorResponse(409, "drive.nao_conectado", "Conecte o Google Drive primeiro");
    }

    const existente = await jobExportDriveMaisRecente(getPool(), auth.host.accountId, eventId);
    if (existente?.estado === "enviando") {
      return jsonOk({ job: telaDoJobDrive(existente) }, { status: 202 });
    }

    if (existente?.estado === "parcial" && jobTemPendentes(existente)) {
      await retomarExportDrive(getPool(), eventId, existente.id);
      const retomado =
        (await jobExportPorId(getPool(), auth.host.accountId, eventId, existente.id)) ?? existente;
      agendar(eventId, auth.host.accountId, retomado.id, auth.host.email);
      return jsonOk({ job: telaDoJobDrive({ ...retomado, estado: "enviando" }) }, { status: 202 });
    }

    const previa = await previaExportDrive(getPool(), auth.host.accountId, eventId);
    if (!previa) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");

    const refreshToken = await refreshTokenDoEvento(getPool(), getDriveVault(), eventId);
    if (!refreshToken) {
      return errorResponse(409, "drive.nao_conectado", "Conecte o Google Drive primeiro");
    }

    const client = getDriveClient();
    try {
      await client.refreshAccessToken(refreshToken);
    } catch {
      await marcarDriveExpirado(getPool(), eventId);
      return errorResponse(409, "drive.expirado", "Reconecte o Google Drive");
    }

    if (previa.bytesTotal > 0) {
      const accessToken = (await client.refreshAccessToken(refreshToken)).accessToken;
      const about = await client.getAbout(accessToken);
      const disponivel =
        about.quota.limitBytes === null
          ? Number.POSITIVE_INFINITY
          : about.quota.limitBytes - about.quota.usageBytes;

      if (disponivel < previa.bytesTotal) {
        console.log("drive_export_quota_exceeded", { eventId });
        return errorResponse(
          409,
          "drive.quota_insuficiente",
          "Seu Drive não tem espaço suficiente para o álbum",
          { necessario: previa.bytesTotal, disponivel: Math.max(0, Math.floor(disponivel)) },
        );
      }
    }

    const job = await criarJobExportDrive(getPool(), auth.host.accountId, eventId, conexao.driveFolderId);
    if (!job) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");

    console.log("drive_export_start", { eventId, fotos: job.fotos, async: true });

    if (job.estado === "enviando") {
      agendar(eventId, auth.host.accountId, job.id, auth.host.email);
    }

    return jsonOk({ job: telaDoJobDrive(job) }, { status: 202 });
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
    const job = await jobExportDriveMaisRecente(getPool(), auth.host.accountId, eventId);
    return jsonOk({ job: job ? telaDoJobDrive(job) : null });
  } catch (e) {
    return unexpectedError("admin.export.drive", e);
  }
}
