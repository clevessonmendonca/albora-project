import { nomeDoArquivoZip } from "@albora/core";
import { jobExportPorId, type JobExport } from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  COUPLE_HOST_ROLES,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { acervoZipStream } from "@/lib/export-stream";
import { streamObject } from "@/lib/r2";
import {
  requestExportStepUp,
  createExportJob,
  getLatestExportJob,
} from "@/lib/application/use-cases/admin";
import {
  createExportSchema,
  getExportSchema,
  getExportFileSchema,
  type CreateExportBody,
} from "@/lib/infrastructure/api/validators";

export const dynamic = "force-dynamic";

async function requireOwnedEvent(req: Request, eventId: string) {
  const cfgErr = requireConfig("admin", { mediaOrigin: true });
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

/** Pede o segundo fator: um magic link de uso único (spec 009). */
export async function postReauth(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_export_reauth:${auth.host.accountId}`, 5, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const resultado = await requestExportStepUp(
      {
        eventId,
        accountId: auth.host.accountId,
        hostEmail: auth.host.email,
        sessionSecret: config().sessionSecret,
        requestOrigin: new URL(req.url).origin,
        isDev: process.env.APP_ENV === "dev",
      },
      getPool(),
    );

    if (!resultado.ok) {
      return errorResponse(403, resultado.code, resultado.message);
    }

    return jsonOk(resultado.link ? { enviado: true, link: resultado.link } : { enviado: true });
  } catch (e) {
    return unexpectedError("admin.export.reauth", e);
  }
}

/** Consome o step-up e abre o job com o recorte published deste evento. */
export async function postExport(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_export:${auth.host.accountId}`, 8, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<CreateExportBody>(req);
  if (parsed instanceof Response) return parsed;

  const validado = createExportSchema.safeParse(parsed.data);
  if (!validado.success) {
    return errorResponse(422, "validation_error", validado.error.issues[0]?.message ?? "Dados inválidos", {
      erros: validado.error.issues,
    });
  }

  try {
    const resultado = await createExportJob(
      {
        eventId,
        accountId: auth.host.accountId,
        hostEmail: auth.host.email,
        sessionSecret: config().sessionSecret,
        requestOrigin: new URL(req.url).origin,
        ...validado.data,
      },
      getPool(),
    );

    if (!resultado.ok) {
      const statusCode = resultado.code === "admin.reauth_invalida" ? 409 : 404;
      return errorResponse(statusCode, resultado.code, resultado.message);
    }

    return jsonOk({ job: resultado.job }, { status: 202 });
  } catch (e) {
    return unexpectedError("admin.export", e);
  }
}

export async function getExport(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_export_get:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const url = new URL(req.url);
    const modoParam = url.searchParams.get("modo");
    const validado = getExportSchema.safeParse({ modo: modoParam });
    const modo = validado.success ? validado.data.modo : undefined;

    const resultado = await getLatestExportJob(
      {
        eventId,
        accountId: auth.host.accountId,
        modo,
      },
      getPool(),
    );

    return jsonOk({ job: resultado.job });
  } catch (e) {
    return unexpectedError("admin.export", e);
  }
}

/** Transmite o ZIP. Um objeto do storage por vez; o POST não monta o arquivo. */
export async function getArquivo(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_export_arquivo:${auth.host.accountId}`, 10, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const jobId = new URL(req.url).searchParams.get("job");
  const validado = getExportFileSchema.safeParse({ job: jobId });
  if (!validado.success) {
    return errorResponse(422, "validation_error", "Job inválido", { campos: ["job"] });
  }

  try {
    const job = await jobExportPorId(getPool(), auth.host.accountId, eventId, validado.data.job);
    if (!job) return errorResponse(404, "export.nao_encontrado", "Export não encontrado");
    if (job.estado !== "pronto") {
      return errorResponse(409, "export.vazio", "Ainda não há fotos publicadas para baixar");
    }

    console.log("admin.export.arquivo", { accountId: auth.host.accountId, fotos: job.fotos });

    return zipDoJob(auth.evento.slug, eventId, job);
  } catch (e) {
    return unexpectedError("admin.export.arquivo", e);
  }
}

function zipDoJob(slug: string, eventId: string, job: JobExport): Response {
  const filename = nomeDoArquivoZip(slug);
  const stream = acervoZipStream(eventId, job.itens, (chave) => streamObject(chave));
  return new Response(stream, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
