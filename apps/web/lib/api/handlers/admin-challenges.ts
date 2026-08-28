import { withEvent, listChallenges, substituirDesafios, substituirMissoesCustom } from "@albora/db";
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

const CUSTOM_TITLE_MAX = 120;

type CorpoPut = {
  titleKeys?: unknown;
  customMissions?: unknown;
};

function serializarDesafio(d: Awaited<ReturnType<typeof listChallenges>>[number]) {
  return {
    id: d.id,
    titleKey: d.chaveTitulo ?? null,
    customTitle: d.tituloCustom ?? null,
    emoji: d.emoji ?? null,
    position: d.ordem,
  };
}

function serializar(lista: Awaited<ReturnType<typeof listChallenges>>) {
  return lista.map(serializarDesafio);
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

  const parsed = await parseJsonBody<CorpoPut>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  try {
    // Pack missions
    if (corpo.titleKeys !== undefined) {
      const titleKeys = parseMissionKeys(pack, corpo.titleKeys);
      if (!titleKeys) {
        return errorResponse(422, "validation_error", "Missões inválidas", { campos: ["titleKeys"] });
      }
      await withEvent(getPool(), eventId, (c) =>
        substituirDesafios(c, eventId, titleKeys),
      );
    }

    // Custom missions
    if (corpo.customMissions !== undefined) {
      if (!Array.isArray(corpo.customMissions)) {
        return errorResponse(422, "validation_error", "customMissions deve ser um array", {
          campos: ["customMissions"],
        });
      }

      const itens: { id?: string; titulo: string; posicao: number; emoji?: string | null }[] = [];
      for (const [i, item] of (corpo.customMissions as unknown[]).entries()) {
        if (typeof item !== "object" || item === null) {
          return errorResponse(422, "validation_error", `Item ${i} inválido`, {
            campos: ["customMissions"],
          });
        }
        const obj = item as Record<string, unknown>;
        const titulo = typeof obj.titulo === "string" ? obj.titulo.trim() : "";
        if (!titulo || titulo.length > CUSTOM_TITLE_MAX) {
          return errorResponse(422, "validation_error", `Título da missão ${i + 1} inválido`, {
            campos: ["customMissions"],
          });
        }
        const entrada: { id?: string; titulo: string; posicao: number; emoji?: string | null } = {
          titulo,
          posicao: typeof obj.posicao === "number" ? obj.posicao : i + 1000,
          emoji: typeof obj.emoji === "string" ? obj.emoji.trim() || null : null,
        };
        if (typeof obj.id === "string") entrada.id = obj.id;
        itens.push(entrada);
      }

      await withEvent(getPool(), eventId, (c) =>
        substituirMissoesCustom(c, eventId, itens),
      );
    }

    const challenges = await withEvent(getPool(), eventId, (c) =>
      listChallenges(c, eventId, null),
    );
    return jsonOk({ packId: owned.evento.packId, challenges: serializar(challenges) });
  } catch (e) {
    return unexpectedError("admin.challenges", e);
  }
}
