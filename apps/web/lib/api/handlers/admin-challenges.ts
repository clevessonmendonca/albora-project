import { withEvent, listChallenges, substituirDesafios } from "@albora/db";
import { PACKS } from "@albora/packs";
import { parseMissionKeys } from "@/features/admin/lib/mission-keys";
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

type Corpo = {
  titleKeys?: unknown;
};

function serializar(lista: Awaited<ReturnType<typeof listChallenges>>) {
  return lista.map((d) => ({
    id: d.id,
    titleKey: d.chaveTitulo,
    position: d.ordem,
  }));
}

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

  try {
    const challenges = await withEvent(getPool(), eventId, (c) =>
      listChallenges(c, eventId, null),
    );
    return jsonOk({ packId: owned.evento.packId, challenges: serializar(challenges) });
  } catch (e) {
    return unexpectedError("admin.challenges", e);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_challenges:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  const pack = PACKS[owned.evento.packId];
  if (!pack) {
    return errorResponse(422, "validation_error", "Pack inválido", { campos: ["packId"] });
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const titleKeys = parseMissionKeys(pack, parsed.data.titleKeys);
  if (!titleKeys) {
    return errorResponse(422, "validation_error", "Missões inválidas", { campos: ["titleKeys"] });
  }

  try {
    const challenges = await withEvent(getPool(), eventId, (c) =>
      substituirDesafios(c, eventId, titleKeys),
    );
    return jsonOk({ packId: owned.evento.packId, challenges: serializar(challenges) });
  } catch (e) {
    return unexpectedError("admin.challenges", e);
  }
}
