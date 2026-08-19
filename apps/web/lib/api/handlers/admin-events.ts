import { criarEvento, ErroSemAcessoAoFornecedor, recordProductEvent } from "@albora/db";
import { FUSO_PADRAO, fusoIanaValido, instanteLocalNoFuso } from "@albora/core";
import { PACKS } from "@albora/packs";
import { parseMissionKeys } from "@/features/admin/lib/mission-keys";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

type Body = {
  packId?: unknown;
  comecaEm?: unknown;
  terminaEm?: unknown;
  timezone?: unknown;
  expectedGuests?: unknown;
  identityTokens?: unknown;
  missoes?: unknown;
  telaoModelos?: unknown;
  title?: unknown;
  vendorId?: unknown;
};

function asDate(v: unknown, fuso: string): Date | null {
  if (typeof v !== "string") return null;
  return instanteLocalNoFuso(v, fuso);
}

/**
 * O anfitrião cria um evento (spec 009).
 *
 * 🔴 A conta vem da **sessão de host**, nunca do corpo — é `comConta` dentro de
 * `criarEvento` que prende a linha a ela. O `packId` é conferido contra o
 * conjunto fechado do registro de packs antes de tocar no banco: pack inválido
 * é 422, não um 500 de violação de FK.
 *
 * `vendorId` (wizard do portal do fornecedor, spec-canal-fornecedor §2) só
 * valida formato aqui — quem confere pertencimento real a `vendor_members` é
 * `criarEvento`, na mesma transação de `comConta`. `ErroSemAcessoAoFornecedor`
 * vira 403, nunca um 500.
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

  let timezone = FUSO_PADRAO;
  if (body.timezone !== undefined) {
    if (typeof body.timezone !== "string" || !fusoIanaValido(body.timezone)) {
      return errorResponse(422, "validation_error", "Fuso horário inválido", {
        campos: ["timezone"],
      });
    }
    timezone = body.timezone;
  }

  const comecaEm = asDate(body.comecaEm, timezone);
  const terminaEm = asDate(body.terminaEm, timezone);
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

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim().slice(0, 120)
      : null;

  let vendorId: string | undefined;
  if (body.vendorId !== undefined) {
    if (typeof body.vendorId !== "string" || !UUID_RE.test(body.vendorId)) {
      return errorResponse(422, "validation_error", "Fornecedor inválido", { campos: ["vendorId"] });
    }
    vendorId = body.vendorId;
  }

  try {
    const input = {
      accountId: auth.host.accountId,
      packId,
      comecaEm,
      terminaEm,
      expectedGuests,
      identityTokens,
      fuso: timezone,
      title,
      ...(missoes !== undefined ? { missoes } : {}),
      ...(vendorId !== undefined ? { vendorId } : {}),
    };
    const { eventoId, slug } = await criarEvento(getPool(), input);

    void recordProductEvent(getPool(), "event_created");

    console.log("admin.evento_criado", { accountId: auth.host.accountId, eventoId });

    return jsonOk({ eventoId, slug });
  } catch (e) {
    if (e instanceof ErroSemAcessoAoFornecedor) {
      return errorResponse(403, "vendor.no_access", "Conta sem acesso a este fornecedor");
    }
    return unexpectedError("admin.eventos", e);
  }
}
