import {
  conexaoDrive,
  criarJobExportDrive,
  finalizarExportDrive,
  jobExportDriveMaisRecente,
  jobExportPorId,
  marcarDriveExpirado,
  marcarItemDriveEnviado,
  previaExportDrive,
  refreshTokenDoEvento,
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
import { driveFolderUrl, executarExportDrive } from "@/lib/drive-export";
import { sendHostEmail } from "@/lib/email";
import { consume } from "@/lib/rate-limit-store";
import { bufferObject } from "@/lib/r2";

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

/**
 * Cria e roda o export para o Drive (spec §4/§5/§7). Síncrono por ora — sem
 * fila local (spec §9, fase 4). Gate de 15GB roda ANTES do INSERT: espaço
 * insuficiente nunca cria job nenhum, e o botão de ZIP continua a saída
 * garantida.
 */
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

    const previa = await previaExportDrive(getPool(), auth.host.accountId, eventId);
    if (!previa) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");

    const refreshToken = await refreshTokenDoEvento(getPool(), getDriveVault(), eventId);
    if (!refreshToken) {
      return errorResponse(409, "drive.nao_conectado", "Conecte o Google Drive primeiro");
    }

    const client = getDriveClient();
    let accessToken: string;
    try {
      accessToken = (await client.refreshAccessToken(refreshToken)).accessToken;
    } catch {
      await marcarDriveExpirado(getPool(), eventId);
      return errorResponse(409, "drive.expirado", "Reconecte o Google Drive");
    }

    if (previa.bytesTotal > 0) {
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

    console.log("drive_export_start", { eventId, fotos: job.fotos });

    if (job.estado === "vazio") {
      return jsonOk({ job: telaDoJobDrive(job) }, { status: 202 });
    }

    const resultado = await executarExportDrive(
      job,
      client,
      accessToken,
      (chave) => bufferObject(chave),
      (itemId, fileId) => marcarItemDriveEnviado(getPool(), eventId, job.id, itemId, fileId),
    );

    await finalizarExportDrive(getPool(), eventId, job.id, resultado.estado);
    const jobFinal = await jobExportPorId(getPool(), auth.host.accountId, eventId, job.id);

    console.log(resultado.estado === "pronto" ? "drive_export_ok" : "drive_export_partial", {
      eventId,
      enviadas: resultado.enviadas,
      total: resultado.total,
    });

    if (resultado.estado === "pronto") {
      void sendHostEmail({
        to: auth.host.email,
        subject: "Suas fotos já estão no Google Drive",
        text: [
          `${resultado.total} ${resultado.total === 1 ? "arquivo foi enviado" : "arquivos foram enviados"} para o Drive de vocês.`,
          "",
          driveFolderUrl(job.driveFolderId ?? ""),
        ].join("\n"),
      });
    }

    return jsonOk({ job: telaDoJobDrive(jobFinal ?? job) }, { status: 202 });
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
