import {
  isCoverImageKey,
  deriveCoverImageKey,
  normalizeCoverImageMime,
  MAX_COVER_IMAGE_BYTES,
  VALIDADE_PRESIGN_SEGUNDOS,
  validateCoverImageContent,
  validateCoverImageDeclaration,
  type CoverImageMime,
} from "@albora/core";
import { atualizarChaveImagemCapa, withEvent } from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { inspectObject, signGet, signPut } from "@/lib/r2";

export const dynamic = "force-dynamic";

type PresignBody = { mime?: unknown; bytes?: unknown };
type ConfirmBody = { chave?: unknown; mime?: unknown };

async function requireAuth(req: Request, eventId: string) {
  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_cover_image:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  // Verifica posse do evento: comConta já aplica RLS por account_id, mas queremos 404 explícito antes do storage.
  const { buscarEventoDoHost } = await import("@albora/db");
  const evento = await buscarEventoDoHost(getPool(), auth.host.accountId, eventId);
  if (!evento) {
    return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  return { auth, evento };
}

function mimeError(mime: string): Response {
  return errorResponse(422, "imagem.tipo_recusado", "Formato não aceito", {
    aceitos: ["image/jpeg", "image/png", "image/webp"],
    recebido: mime,
  });
}

function tamanhoError(code: "imagem.vazia" | "imagem.grande_demais"): Response {
  if (code === "imagem.vazia") return errorResponse(422, code, "Imagem vazia");
  return errorResponse(422, code, "Imagem grande demais", {
    limite_bytes: MAX_COVER_IMAGE_BYTES,
  });
}

/** Presign para upload da imagem de capa. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireAuth(req, eventId);
  if (ctx instanceof Response) return ctx;

  const parsed = await parseJsonBody<PresignBody>(req);
  if (parsed instanceof Response) return parsed;

  const mime = typeof parsed.data.mime === "string" ? parsed.data.mime : "";
  const bytes = typeof parsed.data.bytes === "number" ? parsed.data.bytes : NaN;

  const mimeNormalizado = normalizeCoverImageMime(mime);
  if (!mimeNormalizado) return mimeError(mime);

  const invalido = validateCoverImageDeclaration(mimeNormalizado, bytes);
  if (invalido) return tamanhoError(invalido as "imagem.vazia" | "imagem.grande_demais");

  const chave = deriveCoverImageKey(eventId);

  try {
    const put = await signPut(chave, mimeNormalizado, VALIDADE_PRESIGN_SEGUNDOS);
    console.log("admin.cover_image.presign", { accountId: ctx.auth.host.accountId, eventId });
    return jsonOk({ chave, put: put.toString(), expiraEm: Date.now() + VALIDADE_PRESIGN_SEGUNDOS * 1000 });
  } catch (e) {
    return unexpectedError("admin.cover_image.presign", e);
  }
}

/** Confirma que o upload chegou e persiste a chave. */
export async function confirmPOST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireAuth(req, eventId);
  if (ctx instanceof Response) return ctx;

  const parsed = await parseJsonBody<ConfirmBody>(req);
  if (parsed instanceof Response) return parsed;

  const chave = typeof parsed.data.chave === "string" ? parsed.data.chave : "";
  if (!isCoverImageKey(eventId, chave)) {
    return errorResponse(422, "imagem.chave_invalida", "Chave de storage inválida");
  }

  const mime = typeof parsed.data.mime === "string" ? parsed.data.mime : "";
  const mimeNormalizado: CoverImageMime | null = normalizeCoverImageMime(mime);
  if (!mimeNormalizado) return mimeError(mime);

  try {
    const objeto = await inspectObject(chave);
    if (!objeto) {
      return errorResponse(409, "imagem.ausente", "A imagem ainda não chegou ao storage");
    }

    const invalido = validateCoverImageDeclaration(mimeNormalizado, objeto.bytes);
    if (invalido) return tamanhoError(invalido as "imagem.vazia" | "imagem.grande_demais");

    if (!validateCoverImageContent(mimeNormalizado, objeto.inicio)) {
      return errorResponse(422, "imagem.conteudo_recusado", "Arquivo recusado");
    }

    await withEvent(getPool(), eventId, (c) => atualizarChaveImagemCapa(c, eventId, chave));

    const url = await signGet(chave, VALIDADE_PRESIGN_SEGUNDOS);
    console.log("admin.cover_image.confirmado", { accountId: ctx.auth.host.accountId, eventId });
    return jsonOk({ chave, url: url.toString() });
  } catch (e) {
    return unexpectedError("admin.cover_image.confirm", e);
  }
}

/** Remove a imagem de capa (a chave no banco; o objeto no storage permanece por retenção). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireAuth(req, eventId);
  if (ctx instanceof Response) return ctx;

  try {
    await withEvent(getPool(), eventId, (c) => atualizarChaveImagemCapa(c, eventId, null));
    console.log("admin.cover_image.removido", { accountId: ctx.auth.host.accountId, eventId });
    return jsonOk({ chave: null });
  } catch (e) {
    return unexpectedError("admin.cover_image.delete", e);
  }
}

/** Retorna URL assinada da imagem de capa atual, se existir. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireAuth(req, eventId);
  if (ctx instanceof Response) return ctx;

  const chave = ctx.evento.coverImageKey;
  if (!chave) return jsonOk({ url: null });

  try {
    const url = await signGet(chave, VALIDADE_PRESIGN_SEGUNDOS);
    return jsonOk({ url: url.toString(), chave });
  } catch (e) {
    return unexpectedError("admin.cover_image.get", e);
  }
}
