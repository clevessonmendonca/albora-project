import { comEvento, listarMidiaDaParede, lerModeracaoDoEvento } from "@albora/db";
import { wallDisplayRotationModels, type WallDisplayModel } from "@albora/core";
import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { classifyMediaAfter } from "@/lib/classify-media";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { wallFromRequest } from "@/lib/wall";
import { assinarGet } from "@/lib/r2";

const GET_TTL_SECONDS = 900;

/**
 * O que a parede lê — e nada mais.
 *
 * 1. **Crachá, não sessão.** A rota resolve pela `wall_tokens`; um crachá só
 *    lê, e é o que faz ser seguro deixá-lo numa TV pendurada no salão.
 * 2. **O evento vem do crachá, nunca da URL.** Não há parâmetro de evento aqui:
 *    o crachá já carrega o seu, e a RLS confere de novo dentro de `comEvento`.
 * 3. **O servidor nunca toca nos bytes.** Ele assina a URL de leitura e o
 *    navegador da TV busca a foto direto no storage, como no resto do produto.
 * 4. **A parede falha fechada no classificador.** `listarMidiaDaParede` lê
 *    `published` e segura NULL / `sem-resposta` / suspeito. A galeria (feed)
 *    não. O poll dispara a classificação em fire-and-forget — fora do confirm.
 */
export async function GET(req: Request) {
  const configError = requireConfig("parede", { mediaOrigin: true });
  if (configError) return configError;

  const wall = await wallFromRequest(req);
  if (!wall) {
    return errorResponse(401, "parede.invalida", "Crachá do telão inválido ou expirado");
  }

  const limit = consume(`parede:${wall.eventoId}`, 240, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  classifyMediaAfter(wall.eventoId);

  try {
    const page = await comEvento(getPool(), wall.eventoId, async (c) => {
      const moderacao = await lerModeracaoDoEvento(c, wall.eventoId);
      const lista = await listarMidiaDaParede(c, wall.eventoId);
      const { rows } = await c.query<{ identity_tokens: Record<string, unknown> }>(
        "SELECT identity_tokens FROM events WHERE id = $1",
        [wall.eventoId],
      );
      const tokens = rows[0]?.identity_tokens ?? {};
      const telaoModelos = wallDisplayRotationModels(tokens.telaoModelos) as WallDisplayModel[];
      return { moderacao, lista, telaoModelos };
    });

    const expiraEm = Date.now() + GET_TTL_SECONDS * 1000;

    const itens = await Promise.all(
      page.lista.map(async (m) => ({
        id: m.id,
        autor: m.autor,
        mime: m.mime,
        criadaEm: m.criadaEm.toISOString(),
        reacoes: m.reacoes,
        thumb: await assinarGet(m.chaveThumb, GET_TTL_SECONDS),
        full: await assinarGet(m.chaveFull, GET_TTL_SECONDS),
        ...(m.largura !== undefined && m.altura !== undefined
          ? { largura: m.largura, altura: m.altura }
          : {}),
      })),
    );

    console.log("parede.pagina", { eventoId: wall.eventoId, itens: itens.length });

    return jsonOk({
      itens,
      expiraEm,
      panico: page.moderacao.panico,
      telaoModelos: page.telaoModelos,
    });
  } catch (e) {
    return unexpectedError("parede", e);
  }
}
