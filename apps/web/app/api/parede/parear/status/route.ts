import { VALIDADE_DA_PAREDE_HORAS } from "@albora/core";
import { comEvento, finalizarPareamento } from "@albora/db";
import { PACKS } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CamadaTokens } from "@albora/tokens";
import { errorResponse, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { config, ErroConfig } from "@/lib/config";
import { consume } from "@/lib/rate-limit-store";
import { badgeCookie, PAIRING_COOKIE, clearCookie, pollTokenFromRequest } from "@/lib/wall";

export const dynamic = "force-dynamic";

/**
 * O poll da TV (spec 010).
 *
 * Lê o token de poll do cookie e pergunta ao banco. Enquanto pendente, diz
 * pendente. Quando autorizado, o banco **consome** o pareamento e emite o
 * crachá; aqui ele vira o cookie `albora_parede` e o cookie de pareamento é
 * apagado. O crachá nunca aparece no corpo nem na URL — só no cookie `HttpOnly`,
 * como a sessão do convidado.
 *
 * Junto vai o tema do evento (cor e fonte do casal), para a TV se pintar antes
 * do primeiro quadro sem precisar de outra chamada.
 */
export async function GET(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("parede.config_ausente", { faltando: e.faltando });
      return responder({ status: "expirado" }, 503, []);
    }
    throw e;
  }

  const pollToken = pollTokenFromRequest(req);
  if (!pollToken) return responder({ status: "expirado" }, 200, []);

  const limite = consume(`parear_status:${pollToken}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const expiraCrachaEm = new Date(Date.now() + VALIDADE_DA_PAREDE_HORAS * 3600 * 1000);
    const resultado = await finalizarPareamento(
      getPool(),
      config().sessionSecret,
      pollToken,
      expiraCrachaEm,
      new Date(),
    );

    if (resultado.status === "pendente") {
      return responder({ status: "pendente" }, 200, []);
    }

    if (resultado.status === "expirado") {
      return responder({ status: "expirado" }, 200, [clearCookie(PAIRING_COOKIE)]);
    }

    const variaveis = await temaDoEvento(resultado.eventoId);

    console.log("parede.pareamento_pronto", { eventoId: resultado.eventoId });

    return responder({ status: "pronto", variaveis }, 200, [
      badgeCookie(resultado.cracha, VALIDADE_DA_PAREDE_HORAS),
      clearCookie(PAIRING_COOKIE),
    ]);
  } catch (e) {
    return unexpectedError("parede.status", e);
  }
}

async function temaDoEvento(eventoId: string): Promise<Record<string, string>> {
  const linha = await comEvento(getPool(), eventoId, async (c) => {
    const { rows } = await c.query<{ pack_id: string; identity_tokens: unknown }>(
      "SELECT pack_id, identity_tokens FROM events WHERE id = $1",
      [eventoId],
    );
    return rows[0] ?? null;
  });

  const pack = linha ? PACKS[linha.pack_id] : undefined;
  const evento = (linha?.identity_tokens ?? {}) as CamadaTokens;

  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    pack: pack ? { ...pack.tokens, fundo: "escuro" } : { fundo: "escuro" },
    evento,
  });

  return paraVariaveis(tokens);
}

function responder(corpo: unknown, status: number, cookies: string[]): Response {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(JSON.stringify(corpo), { status, headers });
}
