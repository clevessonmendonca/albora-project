import { atualizarConfigDoEvento } from "@albora/db";
import {
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

export const dynamic = "force-dynamic";

const ADMIN_SESSAO = {
  code: "admin.sem_sessao",
  message: "Entre no painel para continuar",
} as const;

type Corpo = {
  expectedGuests?: unknown;
  identityTokens?: unknown;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSAO);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  return jsonOk({
    expectedGuests: owned.evento.expectedGuests,
    identityTokens: owned.evento.identityTokens,
    packId: owned.evento.packId,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSAO);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_config:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const atualizacao: { expectedGuests?: number; identityTokens?: Record<string, unknown> } = {};

  if (corpo.expectedGuests !== undefined) {
    if (typeof corpo.expectedGuests !== "number" || !Number.isFinite(corpo.expectedGuests)) {
      return errorResponse(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
    const n = Math.trunc(corpo.expectedGuests);
    if (n <= 0) {
      return errorResponse(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
    atualizacao.expectedGuests = n;
  }

  if (corpo.identityTokens !== undefined) {
    if (
      typeof corpo.identityTokens !== "object" ||
      corpo.identityTokens === null ||
      Array.isArray(corpo.identityTokens)
    ) {
      return errorResponse(422, "validation_error", "Identidade inválida", { campos: ["identityTokens"] });
    }
    atualizacao.identityTokens = corpo.identityTokens as Record<string, unknown>;
  }

  if (Object.keys(atualizacao).length === 0) {
    return errorResponse(422, "validation_error", "Nada para atualizar", {
      campos: ["expectedGuests", "identityTokens"],
    });
  }

  try {
    const ok_ = await atualizarConfigDoEvento(
      getPool(),
      auth.host.accountId,
      eventId,
      atualizacao,
    );
    if (!ok_) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");

    const owned = await requireHostEvent(auth.host.accountId, eventId);
    if (owned instanceof Response) return owned;

    return jsonOk({
      expectedGuests: owned.evento.expectedGuests,
      identityTokens: owned.evento.identityTokens,
    });
  } catch (e) {
    return unexpectedError("admin.config", e);
  }
}
