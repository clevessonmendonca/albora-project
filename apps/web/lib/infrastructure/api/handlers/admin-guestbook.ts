import { type GuestbookError } from "@albora/core";
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
  getAdminGuestbook,
  upsertGuestbook,
} from "@/lib/application/use-cases/admin";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import {
  upsertGuestbookSchema,
  clientSentStorageKey,
} from "@/lib/infrastructure/api/validators";

export const dynamic = "force-dynamic";

function mapErro(erro: GuestbookError) {
  switch (erro.code) {
    case "recado.texto_obrigatorio":
      return errorResponse(422, erro.code, "O recado precisa de um texto");
    case "recado.texto_longo_demais":
      return errorResponse(422, erro.code, "Texto longo demais", erro.details);
    case "recado.audio_vazio":
    case "recado.audio_longo_demais":
      return errorResponse(
        422,
        erro.code,
        "Áudio inválido",
        "details" in erro ? erro.details : undefined,
      );
    case "recado.ja_existe":
      return errorResponse(409, erro.code, "Este evento já tem um recado", erro.details);
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  try {
    const resultado = await getAdminGuestbook({ eventId }, getPool());
    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("admin.recado.get", e);
  }
}

/** Anfitrião escreve/edita o recado (spec 019): um por evento; chave de storage no JSON é recusada — cliente nunca a informa. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_recado:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  const parsed = await parseJsonBody(req);
  if (parsed instanceof Response) return parsed;

  if (clientSentStorageKey(parsed.data)) {
    return errorResponse(422, "recado.chave_do_cliente", "A chave de storage não vem do cliente");
  }

  const bodyValidation = validateBody(parsed.data, upsertGuestbookSchema);
  if (bodyValidation instanceof Response) return bodyValidation;

  const resultado = await upsertGuestbook(
    {
      eventId,
      texto: bodyValidation.texto,
      publicaEm: bodyValidation.publicaEm,
    },
    getPool(),
  );

  if (!resultado.ok) {
    return mapErro(resultado.erro);
  }

  return jsonOk({ recado: resultado.recado });
}
