import { comEvento, listarMidiaDaParede, lerModeracaoDoEvento } from "@albora/db";
import { wallDisplayRotationModels, type WallDisplayModel } from "@albora/core";
import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { wallFromRequest } from "@/lib/wall";
import { assinarGet } from "@/lib/r2";

export const dynamic = "force-dynamic";

const VALIDADE_GET_SEGUNDOS = 900;

/**
 * O que a parede lê — e nada mais.
 *
 * 1. **Crachá, não sessão.** A rota resolve pela `wall_tokens`; um crachá só
 *    lê, e é o que faz ser seguro deixá-lo numa TV pendurada no salão.
 * 2. **O evento vem do crachá, nunca da URL.** Não há parâmetro de evento aqui:
 *    o crachá já carrega o seu, e a RLS confere de novo dentro de `comEvento`.
 * 3. **O servidor nunca toca nos bytes.** Ele assina a URL de leitura e o
 *    navegador da TV busca a foto direto no storage, como no resto do produto.
 * 4. **A moderação é a mesma do feed.** `listarMidiaDaParede` lê `published`, a
 *    única fonte de verdade sobre o que é público.
 */
export async function GET(req: Request) {
  const configError = requireConfig("parede", { mediaOrigin: true });
  if (configError) return configError;

  const parede = await wallFromRequest(req);
  if (!parede) {
    return errorResponse(401, "parede.invalida", "Crachá do telão inválido ou expirado");
  }

  const limite = consume(`parede:${parede.eventoId}`, 240, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const midias = await comEvento(getPool(), parede.eventoId, async (c) => {
      const moderacao = await lerModeracaoDoEvento(c, parede.eventoId);
      const lista = await listarMidiaDaParede(c, parede.eventoId);
      const { rows } = await c.query<{ identity_tokens: Record<string, unknown> }>(
        "SELECT identity_tokens FROM events WHERE id = $1",
        [parede.eventoId],
      );
      const tokens = rows[0]?.identity_tokens ?? {};
      const telaoModelos = wallDisplayRotationModels(tokens.telaoModelos) as WallDisplayModel[];
      return { moderacao, lista, telaoModelos };
    });

    const expiraEm = Date.now() + VALIDADE_GET_SEGUNDOS * 1000;

    const itens = await Promise.all(
      midias.lista.map(async (m) => ({
        id: m.id,
        autor: m.autor,
        mime: m.mime,
        criadaEm: m.criadaEm.toISOString(),
        reacoes: m.reacoes,
        thumb: await assinarGet(m.chaveThumb, VALIDADE_GET_SEGUNDOS),
        full: await assinarGet(m.chaveFull, VALIDADE_GET_SEGUNDOS),
      })),
    );

    console.log("parede.pagina", { eventoId: parede.eventoId, itens: itens.length });

    return jsonOk({
      itens,
      expiraEm,
      panico: midias.moderacao.panico,
      telaoModelos: midias.telaoModelos,
    });
  } catch (e) {
    return unexpectedError("parede", e);
  }
}
