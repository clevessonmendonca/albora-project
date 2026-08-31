import { VALIDADE_DA_PAREDE_HORAS } from "@albora/core";
import { withEvent, criarPareamento, finalizarPareamento } from "@albora/db";
import { PACKS } from "@albora/packs";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { TokenLayer } from "@albora/tokens";
import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { config, ErroConfig } from "@/lib/config";
import { consume } from "@/lib/rate-limit-store";
import {
  badgeCookie,
  PAIRING_COOKIE,
  clearCookie,
  pairingCookie,
  pollTokenFromRequest,
} from "@/lib/wall";

const PAIRING_TTL_SECONDS = 10 * 60;

/** TV abre pareamento (spec 010): sem sessão/evento ainda; código curto para a tela, token de poll em cookie HttpOnly — segredo nunca aparece na tela ou no corpo. */
export async function POST(req: Request) {
  const configError = requireConfig("parede");
  if (configError) return configError;

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limit = consume(`parear:${ip.split(",")[0]!.trim()}`, 30, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  try {
    const expiraEm = new Date(Date.now() + PAIRING_TTL_SECONDS * 1000);
    const { code, pollToken } = await criarPareamento(getPool(), config().sessionSecret, expiraEm);

    console.log("parede.pareamento_criado", { expiraEm: expiraEm.toISOString() });

    return jsonOk(
      { code, expiraEm: expiraEm.toISOString() },
      {
        status: 201,
        headers: { "set-cookie": pairingCookie(pollToken, PAIRING_TTL_SECONDS) },
      },
    );
  } catch (e) {
    return unexpectedError("parede.parear", e);
  }
}

/** Poll da TV (spec 010): banco consome o pareamento e emite o crachá; vira `albora_parede` (HttpOnly), cookie de pareamento apagado; tema do evento junto para pintar antes do primeiro quadro. */
export async function GET(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("parede.config_ausente", { faltando: e.faltando });
      return respond({ status: "expirado" }, 503, []);
    }
    throw e;
  }

  const pollToken = pollTokenFromRequest(req);
  if (!pollToken) return respond({ status: "expirado" }, 200, []);

  const limit = consume(`parear_status:${pollToken}`, 30, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  try {
    const expiraCrachaEm = new Date(Date.now() + VALIDADE_DA_PAREDE_HORAS * 3600 * 1000);
    const result = await finalizarPareamento(
      getPool(),
      config().sessionSecret,
      pollToken,
      expiraCrachaEm,
      new Date(),
    );

    if (result.status === "pendente") {
      return respond({ status: "pendente" }, 200, []);
    }

    if (result.status === "expirado") {
      return respond({ status: "expirado" }, 200, [clearCookie(PAIRING_COOKIE)]);
    }

    const variaveis = await eventTheme(result.eventoId);

    console.log("parede.pareamento_pronto", { eventoId: result.eventoId });

    return respond({ status: "pronto", variaveis }, 200, [
      badgeCookie(result.cracha, VALIDADE_DA_PAREDE_HORAS),
      clearCookie(PAIRING_COOKIE),
    ]);
  } catch (e) {
    return unexpectedError("parede.status", e);
  }
}

async function eventTheme(eventoId: string): Promise<Record<string, string>> {
  const row = await withEvent(getPool(), eventoId, async (c) => {
    const { rows } = await c.query<{ pack_id: string; identity_tokens: unknown }>(
      "SELECT pack_id, identity_tokens FROM events WHERE id = $1",
      [eventoId],
    );
    return rows[0] ?? null;
  });

  const pack = row ? PACKS[row.pack_id] : undefined;
  const evento = (row?.identity_tokens ?? {}) as TokenLayer;

  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    pack: pack ? { ...pack.tokens, fundo: "escuro" } : { fundo: "escuro" },
    evento,
  });

  return toVariables(tokens);
}

function respond(body: unknown, status: number, cookies: string[]): Response {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
}
