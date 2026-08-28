import { atualizarConfigDoEvento } from "@albora/db";
import { fusoIanaValido } from "@albora/core";
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
import { wallModelsChoiceError } from "@/features/admin/lib/wall-models";

export const dynamic = "force-dynamic";

type Corpo = {
  expectedGuests?: unknown;
  timezone?: unknown;
  identityTokens?: unknown;
  telaoModelos?: unknown;
  title?: unknown;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  return jsonOk({
    expectedGuests: owned.evento.expectedGuests,
    timezone: owned.evento.fuso,
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

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
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

  const atualizacao: {
    expectedGuests?: number;
    identityTokens?: Record<string, unknown>;
    fuso?: string;
    title?: string | null;
  } = {};

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

  if (corpo.timezone !== undefined) {
    if (typeof corpo.timezone !== "string" || !fusoIanaValido(corpo.timezone)) {
      return errorResponse(422, "validation_error", "Fuso horário inválido", {
        campos: ["timezone"],
      });
    }
    atualizacao.fuso = corpo.timezone;
  }

  if (corpo.identityTokens !== undefined) {
    if (
      typeof corpo.identityTokens !== "object" ||
      corpo.identityTokens === null ||
      Array.isArray(corpo.identityTokens)
    ) {
      return errorResponse(422, "validation_error", "Identidade inválida", { campos: ["identityTokens"] });
    }
    const tokens = corpo.identityTokens as Record<string, unknown>;
    if (tokens.telaoModelos !== undefined) {
      const wallErr = wallModelsChoiceError(tokens.telaoModelos);
      if (wallErr) {
        return errorResponse(422, "validation_error", wallErr.join(" "), {
          campos: ["identityTokens"],
        });
      }
    }
    atualizacao.identityTokens = tokens;
  }

  if (corpo.title !== undefined) {
    if (corpo.title !== null && typeof corpo.title !== "string") {
      return errorResponse(422, "validation_error", "Título inválido", { campos: ["title"] });
    }
    const t = typeof corpo.title === "string" ? corpo.title.trim().slice(0, 120) || null : null;
    atualizacao.title = t;
  }

  if (Object.keys(atualizacao).length === 0) {
    return errorResponse(422, "validation_error", "Nada para atualizar", {
      campos: ["expectedGuests", "timezone", "identityTokens", "title"],
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
      timezone: owned.evento.fuso,
      identityTokens: owned.evento.identityTokens,
    });
  } catch (e) {
    return unexpectedError("admin.config", e);
  }
}
