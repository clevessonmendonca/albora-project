import { modoInteracao } from "@albora/core";
import {
  comEvento,
  desafioDoEvento,
  ErroCursorInvalido,
  gateDoEvento,
  listarFeed,
  type PaginaFeed,
} from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VAZIO: PaginaFeed = { itens: [], proximoCursor: null };

/**
 * O feed do evento — o que os outros mandaram, para fazer o convidado mandar
 * mais (ADR 0009).
 *
 * Três coisas decidem esta rota, e nenhuma delas é negociável:
 *
 * 1. **O evento vem da sessão, nunca da URL.** O `evento` da querystring, se
 *    vier, é conferido contra ela — divergência é 403, e nunca "usa o da URL".
 * 2. **A moderação é a única fonte de verdade sobre o que é público.** O feed
 *    não guarda uma segunda; lê a mesma coluna que o telão.
 * 3. **O gate é regra de servidor.** Antes dele a contagem não é calculada, e
 *    por isso não chega ao corpo da resposta — esconder na tela é esconder de
 *    quem não abre o devtools.
 */
export async function GET(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const limite = consumir(identidadeParaLimite(req, sessao), 120, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  const parametros = new URL(req.url).searchParams;
  const eventoPedido = parametros.get("evento");

  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    console.warn("feed.evento_divergente", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
    });
    return erro(403, "feed.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const missao = parametros.get("missao");
  if (missao !== null && !UUID.test(missao)) {
    return erro(422, "validation_error", "Filtro inválido", { campos: ["missao"] });
  }

  const cursor = parametros.get("cursor");

  try {
    const pagina = await comEvento(banco(), sessao.eventoId, async (c) => {
      const gate = await gateDoEvento(c, sessao.eventoId);
      // Sessão de um evento que não é visível recebe página vazia, não erro:
      // um 404 aqui confirmaria quais ids existem.
      if (!gate) return VAZIO;

      // Missão é conjunto fechado, e o conjunto vem do banco. Uma que não é
      // deste evento filtra tudo — não vira "sem filtro", que devolveria o
      // feed inteiro para quem pediu um recorte.
      if (missao !== null && !(await desafioDoEvento(c, sessao.eventoId, missao))) return VAZIO;

      return listarFeed(c, {
        eventoId: sessao.eventoId,
        modo: modoInteracao(gate, new Date()),
        missaoId: missao,
        cursor,
      });
    });

    console.log("feed.pagina", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      itens: pagina.itens.length,
      comFiltro: missao !== null,
      continua: pagina.proximoCursor !== null,
    });

    return ok(pagina);
  } catch (e) {
    if (e instanceof ErroCursorInvalido) {
      // Ignorar o cursor inválido e devolver a primeira página faria a
      // rolagem voltar ao topo sozinha — pior que o erro.
      return erro(422, e.code, "Cursor inválido", { campos: ["cursor"] });
    }
    return erroInesperado("feed", e);
  }
}
