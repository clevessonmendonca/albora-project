import { comEvento, listarMinhasDoEvento } from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * Galeria pessoal: o que esta sessão já confirmou no servidor (spec 008).
 *
 * Pendentes da fila local não passam aqui — o cliente as junta com
 * `montarGaleria()` do núcleo.
 */
export async function GET(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    return erro(403, "galeria.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const limite = consumir(identidadeParaLimite(req, sessao), 120, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  try {
    const enviadas = await comEvento(banco(), sessao.eventoId, (c) =>
      listarMinhasDoEvento(c, sessao.sessaoId),
    );

    return ok({
      enviadas: enviadas.map((m) => ({
        id: m.id,
        chaveThumb: m.chaveThumb,
        chaveFull: m.chaveFull,
        criadaEm: m.criadaEm.toISOString(),
      })),
    });
  } catch (e) {
    return erroInesperado("galeria.minhas", e);
  }
}
