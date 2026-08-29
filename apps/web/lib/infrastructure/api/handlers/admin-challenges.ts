import { PACKS } from "@albora/packs";
import { parseMissionKeys } from "@/features/admin/lib/mission-keys";
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
import {
  listChallengesUseCase,
  updatePackMissions,
  updateCustomMissions,
} from "@/lib/application/use-cases/admin";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import { updateChallengesSchema } from "@/lib/infrastructure/api/validators";

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
    const resultado = await listChallengesUseCase(
      { eventId, packId: owned.evento.packId },
      getPool(),
    );
    return jsonOk(resultado);
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

  const validation = await validateBody(req, updateChallengesSchema);
  if (validation instanceof Response) return validation;

  try {
    let resultado;

    if (validation.titleKeys !== undefined) {
      const titleKeys = parseMissionKeys(pack, validation.titleKeys);
      if (!titleKeys) {
        return errorResponse(422, "validation_error", "Missões inválidas", {
          campos: ["titleKeys"],
        });
      }
      resultado = await updatePackMissions(
        { eventId, packId: owned.evento.packId, titleKeys },
        getPool(),
      );
    }

    if (validation.customMissions !== undefined) {
      resultado = await updateCustomMissions(
        {
          eventId,
          packId: owned.evento.packId,
          customMissions: validation.customMissions.map((m) => ({
            titulo: m.titulo,
            posicao: m.posicao,
            emoji: m.emoji,
            ...(m.id !== undefined ? { id: m.id } : {}),
          })),
        },
        getPool(),
      );
    }

    if (!resultado) {
      const empty = await listChallengesUseCase(
        { eventId, packId: owned.evento.packId },
        getPool(),
      );
      return jsonOk(empty);
    }

    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("admin.challenges", e);
  }
}
