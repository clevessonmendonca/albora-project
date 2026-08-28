import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import {
  presignCoverImageUpload,
  confirmCoverImageUpload,
  removeCoverImage,
  getCoverImageUrl,
} from "@/lib/application/use-cases/admin";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import {
  presignCoverImageSchema,
  confirmCoverImageSchema,
} from "@/lib/infrastructure/api/validators";

export const dynamic = "force-dynamic";

async function requireAuth(req: Request, eventId: string) {
  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_cover_image:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const { buscarEventoDoHost } = await import("@albora/db");
  const evento = await buscarEventoDoHost(getPool(), auth.host.accountId, eventId);
  if (!evento) {
    return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  return { auth, evento };
}

/** Presign para upload da imagem de capa. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireAuth(req, eventId);
  if (ctx instanceof Response) return ctx;

  const validation = await validateBody(req, presignCoverImageSchema);
  if (validation instanceof Response) return validation;

  const resultado = await presignCoverImageUpload({
    eventId,
    accountId: ctx.auth.host.accountId,
    mime: validation.mime,
    bytes: validation.bytes,
  });

  if (!resultado.ok) {
    return errorResponse(422, resultado.code, resultado.message, resultado.details);
  }

  return jsonOk({ chave: resultado.chave, put: resultado.put, expiraEm: resultado.expiraEm });
}

/** Confirma que o upload chegou e persiste a chave. */
export async function confirmPOST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireAuth(req, eventId);
  if (ctx instanceof Response) return ctx;

  const validation = await validateBody(req, confirmCoverImageSchema);
  if (validation instanceof Response) return validation;

  const resultado = await confirmCoverImageUpload(
    {
      eventId,
      accountId: ctx.auth.host.accountId,
      chave: validation.chave,
      mime: validation.mime,
    },
    getPool(),
  );

  if (!resultado.ok) {
    return errorResponse(
      resultado.code === "imagem.ausente" ? 409 : 422,
      resultado.code,
      resultado.message,
      resultado.details,
    );
  }

  return jsonOk({ chave: resultado.chave, url: resultado.url });
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
    await removeCoverImage({ eventId, accountId: ctx.auth.host.accountId }, getPool());
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

  try {
    const resultado = await getCoverImageUrl({
      eventId,
      coverImageKey: ctx.evento.coverImageKey,
    });
    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("admin.cover_image.get", e);
  }
}
