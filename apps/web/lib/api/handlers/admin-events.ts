import { criarEvento } from "@albora/db";
import { PACKS } from "@albora/packs";
import { parseMissionKeys } from "@/features/admin/lib/mission-keys";
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

type Body = {
  packId?: unknown;
  comecaEm?: unknown;
  terminaEm?: unknown;
  expectedGuests?: unknown;
  identityTokens?: unknown;
  missoes?: unknown;
  telaoModelos?: unknown;
};

function asDate(v: unknown): Date | null {
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

  const limit = consume(`admin_eventos:${auth.host.accountId}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;
  const body = parsed.data;

  const packId = typeof body.packId === "string" ? body.packId : "";
  if (!(packId in PACKS)) {
    return errorResponse(422, "validation_error", "Pack inválido", { campos: ["packId"] });
  }

  const comecaEm = asDate(body.comecaEm);
  const terminaEm = asDate(body.terminaEm);
  if (!comecaEm || !terminaEm || terminaEm <= comecaEm) {
    return errorResponse(422, "validation_error", "Datas inválidas", {
      campos: ["comecaEm", "terminaEm"],
    });
  }

  let expectedGuests = 150;
  if (body.expectedGuests !== undefined) {
    if (typeof body.expectedGuests !== "number" || !Number.isFinite(body.expectedGuests)) {
      return errorResponse(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
    expectedGuests = Math.trunc(body.expectedGuests);
    if (expectedGuests <= 0) {
      return errorResponse(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
  }

  let identityTokens: Record<string, unknown> = {};
  if (body.identityTokens !== undefined) {
    if (
      typeof body.identityTokens !== "object" ||
      body.identityTokens === null ||
      Array.isArray(body.identityTokens)
    ) {
      return errorResponse(422, "validation_error", "Identidade inválida", {
        campos: ["identityTokens"],
      });
    }
    identityTokens = body.identityTokens as Record<string, unknown>;
  }

  if (Array.isArray(body.telaoModelos) && body.telaoModelos.every((m) => typeof m === "string")) {
    identityTokens = { ...identityTokens, telaoModelos: body.telaoModelos };
  }

  let missoes: string[] | undefined;
  if (body.missoes !== undefined) {
    const pack = PACKS[packId]!;
    const parsedKeys = parseMissionKeys(pack, body.missoes);
    if (!parsedKeys) {
      return errorResponse(422, "validation_error", "Missões inválidas", { campos: ["missoes"] });
    }
    missoes = parsedKeys;
  }

  try {
    const input = {
      accountId: auth.host.accountId,
      packId,
      comecaEm,
      terminaEm,
      expectedGuests,
      identityTokens,
      ...(missoes !== undefined ? { missoes } : {}),
    };
    const { eventoId, slug } = await criarEvento(getPool(), input);

    console.log("admin.evento_criado", { accountId: auth.host.accountId, eventoId });

    return jsonOk({ eventoId, slug });
  } catch (e) {
    return unexpectedError("admin.eventos", e);
  }
}
