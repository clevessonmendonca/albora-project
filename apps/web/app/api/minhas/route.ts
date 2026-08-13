import { modoInteracao } from "@albora/core";
import { comEvento, gateDoEvento, listarMinhasDoEvento } from "@albora/db";
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
    const resultado = await comEvento(banco(), sessao.eventoId, async (c) => {
      const gate = await gateDoEvento(c, sessao.eventoId);
      if (!gate) return { interacao: "espelho" as const, enviadas: [] };

      const interacao = modoInteracao(gate, new Date());
      const modo = interacao === "completo" ? "completo" : "espelho";
      const enviadas = await listarMinhasDoEvento(c, sessao.sessaoId, modo);

      return { interacao, enviadas };
    });

    return ok({
      interacao: resultado.interacao,
      enviadas: resultado.enviadas.map((m) => ({
        id: m.id,
        chaveThumb: m.chaveThumb,
        chaveFull: m.chaveFull,
        mime: m.mime,
        criadaEm: m.criadaEm.toISOString(),
        autor: m.autor,
        legenda: m.legenda,
        lugar: m.lugar,
        ...(typeof m.reacoes === "number" ? { reacoes: m.reacoes } : {}),
        ...(m.minhaReacao !== undefined ? { minhaReacao: m.minhaReacao } : {}),
      })),
    });
  } catch (e) {
    return erroInesperado("galeria.minhas", e);
  }
}
