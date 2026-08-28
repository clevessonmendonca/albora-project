import { nomeDoArquivoZip, podeBaixarZip, resolver, selecionarParaAlbum, planejarCapitulos, TETO_DE_PAGINAS_PADRAO } from "@albora/core";
import {
  withEvent,
  consumirStepUp,
  criarJobExport,
  emitirStepUp,
  ErroMagicLinkInvalido,
  jobExportMaisRecente,
  jobExportPorId,
  midiaParaCuradoria,
  planoDoEvento,
  VALIDADE_STEP_UP_MINUTOS,
  type JobExport,
} from "@albora/db";
import { PACKS } from "@albora/packs";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  COUPLE_HOST_ROLES,
  requireConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { acervoZipStream } from "@/lib/export-stream";
import { consume } from "@/lib/rate-limit-store";
import { streamObject } from "@/lib/r2";

export const dynamic = "force-dynamic";

type CreateBody = { token?: unknown; curated?: unknown };

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
    const plan = await withEvent(getPool(), eventId, (c) => planoDoEvento(c, eventId));
    if (!podeBaixarZip(plan)) {
      return errorResponse(
        403,
        "plano.zip",
        "O download em ZIP entra no plano Completo. Subir de plano não interrompe os convidados.",
      );
    }

    const expiresAt = new Date(Date.now() + VALIDADE_STEP_UP_MINUTOS * 60 * 1000);
    const { token } = await emitirStepUp(getPool(), config().sessionSecret, auth.host.accountId, expiresAt);
    const origin = new URL(req.url).origin;
    const link = `${origin}/admin/e/${eventId}/album?exportar=${token}`;

    void sendHostEmail({
      to: auth.host.email,
      subject: "Confirme o download do álbum",
      text: [
        "Alguém pediu para baixar todas as fotos deste evento.",
        "Se foi você, abra o link abaixo. Ele vale por 15 minutos e só funciona uma vez.",
        "",
        link,
        "",
        "Se não foi você, ignore este e-mail. Sem a confirmação o download não começa.",
      ].join("\n"),
    });

    console.log("admin.export.reauth", { accountId: auth.host.accountId });

    const dev = process.env.APP_ENV === "dev";
    return jsonOk(dev ? { enviado: true, link } : { enviado: true });
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

  const parsed = await parseJsonBody<CreateBody>(req);
  if (parsed instanceof Response) return parsed;
  const token = typeof parsed.data.token === "string" ? parsed.data.token : "";
  const curated = parsed.data.curated === true;
  if (!token) {
    return errorResponse(422, "validation_error", "Confirme o download", { campos: ["token"] });
  }

  try {
    await consumirStepUp(getPool(), config().sessionSecret, token, auth.host.accountId, new Date());
  } catch (e) {
    if (e instanceof ErroMagicLinkInvalido) {
      return errorResponse(409, "admin.reauth_invalida", "Confirmação inválida ou expirada");
    }
    return unexpectedError("admin.export.reauth", e);
  }

  try {
    let curatedIds: string[] | undefined;
    if (curated) {
      const data = await midiaParaCuradoria(getPool(), eventId);
      if (data.janela && data.midias.length > 0) {
        const pack = data.packId ? PACKS[data.packId] : undefined;
        const plano = {
          janela: {
            comecaEm: data.janela.comecaEm,
            terminaEm: data.janela.terminaEm,
            offsetMinutos: data.janela.offsetMinutos,
          },
          capitulos: planejarCapitulos(
            {
              comecaEm: data.janela.comecaEm,
              terminaEm: data.janela.terminaEm,
              offsetMinutos: data.janela.offsetMinutos,
            },
            pack?.momentos?.map((m) => m.id) ?? [],
          ),
          tetoDePaginas: TETO_DE_PAGINAS_PADRAO,
        };
        const resolvidas = resolver(data.midias, plano);
        const selecao = selecionarParaAlbum(resolvidas, plano);
        curatedIds = selecao.mantidas.map((m) => m.id);
      }
    }

    const opts = curated && curatedIds ? { curated, curatedIds } : curated ? { curated } : undefined;
    const job = await criarJobExport(getPool(), auth.host.accountId, eventId, opts);
    if (!job) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");

    console.log("admin.export.job", {
      accountId: auth.host.accountId,
      modo: job.modo,
      fotos: job.fotos,
      estado: job.estado,
    });

    if (job.estado === "pronto") {
      const origin = new URL(req.url).origin;
      void sendHostEmail({
        to: auth.host.email,
        subject: "As fotos da festa estão prontas",
        text: [
          `O álbum está pronto: ${job.fotos} ${job.fotos === 1 ? "arquivo" : "arquivos"}.`,
          "Entre no painel para baixar. O download pede que você esteja conectado.",
          "",
          `${origin}/admin/e/${eventId}/album`,
        ].join("\n"),
      });
    }

    return jsonOk({ job: telaDoJob(eventId, job) }, { status: 202 });
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
    const modo: "full" | "curated" | undefined =
      modoParam === "curated" ? "curated" : modoParam === "full" ? "full" : undefined;
    const job = await jobExportMaisRecente(getPool(), auth.host.accountId, eventId, modo);
    return jsonOk({ job: job ? telaDoJob(eventId, job) : null });
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
  if (!jobId || !UUID_RE.test(jobId)) {
    return errorResponse(422, "validation_error", "Job inválido", { campos: ["job"] });
  }

  try {
    const job = await jobExportPorId(getPool(), auth.host.accountId, eventId, jobId);
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
