import { withEvent, listarMidiaDaParede, lerModeracaoDoEvento } from "@albora/db";
import { wallDisplayRotationModels, type WallDisplayModel } from "@albora/core";
import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { classifyMediaAfter } from "@/lib/classify-media";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { wallFromRequest } from "@/lib/wall";
import { assinarGet } from "@/lib/r2";

const GET_TTL_SECONDS = 900;

/** Parede: crachá não sessão (TV pendurada no salão); evento do crachá, nunca da URL; servidor assina URL, TV busca direto no storage; falha fechada — `published` segura NULL/suspeito. */
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
    const page = await withEvent(getPool(), wall.eventoId, async (c) => {
      const moderacao = await lerModeracaoDoEvento(c, wall.eventoId);
      const lista = await listarMidiaDaParede(c, wall.eventoId);
      const { rows } = await c.query<{ identity_tokens: Record<string, unknown> }>(
        "SELECT identity_tokens FROM events WHERE id = $1",
        [wall.eventoId],
      );
      const tokens = rows[0]?.identity_tokens ?? {};
      const telaoModelos = wallDisplayRotationModels(tokens.telaoModelos) as WallDisplayModel[];
      // Contagem total do evento (não a janela de rotação de `listarMidiaDaParede`,
      // que é capada): o total honesto de "N fotos · M pessoas" para a prova
      // social do telão. Sob `withEvent` a RLS já escopa por evento — o COUNT
      // não cruza eventos. `::int` para o node-pg devolver número, não string.
      const { rows: contagem } = await c.query<{ fotos: number; convidados: number }>(
        `SELECT COUNT(*)::int AS fotos,
                COUNT(DISTINCT session_id)::int AS convidados
           FROM uploads WHERE state = 'published'`,
      );
      const contadores = contagem[0] ?? { fotos: 0, convidados: 0 };
      return { moderacao, lista, telaoModelos, contadores };
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
      contadores: page.contadores,
    });
  } catch (e) {
    return unexpectedError("parede", e);
  }
}
