import { criarEvento } from "@albora/db";
import { PACKS } from "@albora/packs";
import { parseMissionKeys } from "@/features/admin/lib/parse-mission-keys";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

type Corpo = {
  packId?: unknown;
  comecaEm?: unknown;
  terminaEm?: unknown;
  expectedGuests?: unknown;
  identityTokens?: unknown;
  missoes?: unknown;
  telaoModelos?: unknown;
};

function comoData(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * O anfitrião cria um evento (spec 009).
 *
 * 🔴 A conta vem da **sessão de host**, nunca do corpo — é `comConta` dentro de
 * `criarEvento` que prende a linha a ela. O `packId` é conferido contra o
 * conjunto fechado do registro de packs antes de tocar no banco: pack inválido
 * é 422, não um 500 de violação de FK.
 */
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, {
    code: "admin.sem_sessao",
    message: "Entre no painel para criar um evento",
  });
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_eventos:${auth.host.accountId}`, 20, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const packId = typeof corpo.packId === "string" ? corpo.packId : "";
  if (!(packId in PACKS)) {
    return errorResponse(422, "validation_error", "Pack inválido", { campos: ["packId"] });
  }

  const comecaEm = comoData(corpo.comecaEm);
  const terminaEm = comoData(corpo.terminaEm);
  if (!comecaEm || !terminaEm || terminaEm <= comecaEm) {
    return errorResponse(422, "validation_error", "Datas inválidas", {
      campos: ["comecaEm", "terminaEm"],
    });
  }

  let expectedGuests = 150;
  if (corpo.expectedGuests !== undefined) {
    if (typeof corpo.expectedGuests !== "number" || !Number.isFinite(corpo.expectedGuests)) {
      return errorResponse(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
    expectedGuests = Math.trunc(corpo.expectedGuests);
    if (expectedGuests <= 0) {
      return errorResponse(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
  }

  let identityTokens: Record<string, unknown> = {};
  if (corpo.identityTokens !== undefined) {
    if (
      typeof corpo.identityTokens !== "object" ||
      corpo.identityTokens === null ||
      Array.isArray(corpo.identityTokens)
    ) {
      return errorResponse(422, "validation_error", "Identidade inválida", {
        campos: ["identityTokens"],
      });
    }
    identityTokens = corpo.identityTokens as Record<string, unknown>;
  }

  if (Array.isArray(corpo.telaoModelos) && corpo.telaoModelos.every((m) => typeof m === "string")) {
    identityTokens = { ...identityTokens, telaoModelos: corpo.telaoModelos };
  }

  let missoes: string[] | undefined;
  if (corpo.missoes !== undefined) {
    const pack = PACKS[packId]!;
    const parsedKeys = parseMissionKeys(pack, corpo.missoes);
    if (!parsedKeys) {
      return errorResponse(422, "validation_error", "Missões inválidas", { campos: ["missoes"] });
    }
    missoes = parsedKeys;
  }

  try {
    const entrada = {
      accountId: auth.host.accountId,
      packId,
      comecaEm,
      terminaEm,
      expectedGuests,
      identityTokens,
      ...(missoes !== undefined ? { missoes } : {}),
    };
    const { eventoId, slug } = await criarEvento(getPool(), entrada);

    console.log("admin.evento_criado", { accountId: auth.host.accountId, eventoId });

    return jsonOk({ eventoId, slug });
  } catch (e) {
    return unexpectedError("admin.eventos", e);
  }
}
