import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { getGuestMetrics, updateSessionName } from "@/lib/application/use-cases/admin";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import { updateSessionNameSchema } from "@/lib/infrastructure/api/validators";

/** Funil agregado (spec 009 B-07) e nomes no telão (flows.md N3.3). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false, mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limit = consume(`admin_convidados:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  try {
    const owned = await requireHostEvent(auth.host.accountId, eventId);
    if (owned instanceof Response) return owned;
    const { evento } = owned;

    const resultado = await getGuestMetrics(
      { eventId, expectedGuests: evento.expectedGuests },
      getPool(),
    );

    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("admin.convidados", e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_nome:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  const validation = await validateBody(req, updateSessionNameSchema);
  if (validation instanceof Response) return validation;

  const resultado = await updateSessionName(
    {
      accountId: auth.host.accountId,
      eventId,
      sessaoId: validation.sessaoId,
      acao: validation.acao,
      nome: validation.nome,
    },
    getPool(),
  );

  if (!resultado.ok) {
    return errorResponse(
      resultado.code === "sessao.nao_encontrada" ? 404 : 422,
      resultado.code,
      resultado.message,
      resultado.code === "validation_error" ? { campos: ["nome"] } : undefined,
    );
  }

  return jsonOk({
    id: resultado.id,
    nome: resultado.nome,
    fotos: resultado.fotos,
  });
}
