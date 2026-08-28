import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import {
  presignGuestbookAudioUpload,
  confirmGuestbookAudioUpload,
  deleteGuestbookAudio,
} from "@/lib/application/use-cases/admin";
import {
  presignGuestbookAudioSchema,
  confirmGuestbookAudioSchema,
  type PresignGuestbookAudioBody,
  type ConfirmGuestbookAudioBody,
} from "@/lib/infrastructure/api/validators";

export const dynamic = "force-dynamic";

async function requireHostRecado(req: Request, eventId: string) {
  const cfgErr = requireConfig("admin", { mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_recado_audio:${auth.host.accountId}`, 20, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  return auth;
}

/** Presign do áudio: chave derivada aqui, nunca do cliente; token do convidado não passa por esta rota. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireHostRecado(req, eventId);
  if (auth instanceof Response) return auth;

  const parsed = await parseJsonBody<PresignGuestbookAudioBody>(req);
  if (parsed instanceof Response) return parsed;

  const validado = presignGuestbookAudioSchema.safeParse(parsed.data);
  if (!validado.success) {
    return errorResponse(422, "validation_error", validado.error.errors[0]?.message ?? "Dados inválidos", {
      erros: validado.error.errors,
    });
  }

  try {
    const resultado = await presignGuestbookAudioUpload({
      eventId,
      accountId: auth.host.accountId,
      ...validado.data,
    });

    if (!resultado.ok) {
      const statusCode = resultado.code === "recado.audio_grande_demais" ? 422 : 422;
      return errorResponse(statusCode, resultado.code, resultado.message, resultado.details);
    }

    return jsonOk({
      chave: resultado.chave,
      put: resultado.put,
      expiraEm: resultado.expiraEm,
    });
  } catch (e) {
    return unexpectedError("admin.recado_audio.presign", e);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireHostRecado(req, eventId);
  if (auth instanceof Response) return auth;

  try {
    const resultado = await deleteGuestbookAudio(
      {
        eventId,
        accountId: auth.host.accountId,
      },
      getPool(),
    );

    if (!resultado.ok) {
      return errorResponse(404, resultado.code, resultado.message);
    }

    return jsonOk({ recado: resultado.recado });
  } catch (e) {
    return unexpectedError("admin.recado_audio.delete", e);
  }
}

export async function confirmPOST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireHostRecado(req, eventId);
  if (auth instanceof Response) return auth;

  const parsed = await parseJsonBody<ConfirmGuestbookAudioBody>(req);
  if (parsed instanceof Response) return parsed;

  const validado = confirmGuestbookAudioSchema.safeParse(parsed.data);
  if (!validado.success) {
    return errorResponse(422, "validation_error", validado.error.errors[0]?.message ?? "Dados inválidos", {
      erros: validado.error.errors,
    });
  }

  try {
    const resultado = await confirmGuestbookAudioUpload(
      {
        eventId,
        accountId: auth.host.accountId,
        ...validado.data,
      },
      getPool(),
    );

    if (!resultado.ok) {
      const statusCode = resultado.code === "recado.audio_ausente" ? 409 : 422;
      return errorResponse(statusCode, resultado.code, resultado.message, resultado.details);
    }

    return jsonOk({ recado: resultado.recado });
  } catch (e) {
    return unexpectedError("admin.recado_audio.confirm", e);
  }
}
