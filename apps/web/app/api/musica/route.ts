import {
  exibirMusica,
  lerLinkDeMusica,
  ordenarSugestoes,
  registrarSugestao,
  votos,
} from "@albora/core";
import {
  adicionarSugestao,
  comEvento,
  gateDoEvento,
  listarSugestoes,
  musicaDoCasal,
} from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

type Corpo = { url?: unknown; evento?: unknown };

/**
 * A musica do casal e as sugestoes dos convidados (spec 018, camada 1 do ADR
 * 0011). So metadado e link saem daqui — nunca bytes de audio.
 *
 * Como no feed: o evento vem da sessao, nunca da URL. O `evento` da querystring
 * ou do corpo, se vier, e conferido contra ela — divergencia e 403.
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

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    console.warn("musica.evento_divergente", { eventoId: sessao.eventoId, sessaoId: sessao.sessaoId });
    return erro(403, "musica.evento_divergente", "Esta sessão não pertence a este evento");
  }

  try {
    const corpo = await comEvento(banco(), sessao.eventoId, async (c) => {
      const escolhida = await musicaDoCasal(c, sessao.eventoId);
      const fila = ordenarSugestoes(await listarSugestoes(c, sessao.eventoId));
      return { escolhida, fila };
    });

    const musica = corpo.escolhida
      ? { provedor: corpo.escolhida.link.provedor, ...exibirMusica(corpo.escolhida.link, corpo.escolhida.metadado) }
      : null;

    const sugestoes = corpo.fila.map((f) => ({
      provedor: f.link.provedor,
      tipo: f.link.tipo,
      url: f.link.url,
      votos: votos(f),
    }));

    return ok({ musica, sugestoes });
  } catch (e) {
    return erroInesperado("musica.get", e);
  }
}

/**
 * O convidado sugere uma faixa. O link colado e dado de usuario e passa por
 * `lerLinkDeMusica` — host fora do conjunto fechado e recusado com 422, nunca
 * salvo para quebrar depois. O teto por sessao e o gate de interacao sao do
 * nucleo (`registrarSugestao`), avaliados sobre a fila atual antes da escrita.
 */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const limite = consumir(identidadeParaLimite(req, sessao), 30, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  if (corpo.evento !== undefined && corpo.evento !== sessao.eventoId) {
    console.warn("musica.evento_divergente", { eventoId: sessao.eventoId, sessaoId: sessao.sessaoId });
    return erro(403, "musica.evento_divergente", "Esta sessão não pertence a este evento");
  }

  if (typeof corpo.url !== "string") {
    return erro(422, "validation_error", "Dados incompletos", { campos: ["url"] });
  }

  const lido = lerLinkDeMusica(corpo.url);
  if (!lido.ok) {
    console.warn("musica.link_recusado", { eventoId: sessao.eventoId, code: lido.erro.code });
    return erro(422, lido.erro.code, "Link não aceito", lido.erro.details);
  }
  const link = lido.link;

  try {
    const resultado = await comEvento(banco(), sessao.eventoId, async (c) => {
      const gate = await gateDoEvento(c, sessao.eventoId);
      // Sessao de um evento nao visivel: mesma resposta de gate fechado, sem
      // confirmar quais ids existem.
      if (!gate) return { tipo: "fechado" as const };

      const fila = await listarSugestoes(c, sessao.eventoId);
      const decisao = registrarSugestao(fila, { sessaoId: sessao.sessaoId, link }, gate, new Date());
      if (!decisao.ok) return { tipo: "recusada" as const, erro: decisao.erro };

      await adicionarSugestao(c, { eventoId: sessao.eventoId, sessaoId: sessao.sessaoId, link });
      const atual = ordenarSugestoes(await listarSugestoes(c, sessao.eventoId));
      return { tipo: "aceita" as const, fila: atual };
    });

    if (resultado.tipo === "fechado") {
      return erro(403, "musica.interacao_fechada", "A interação ainda não abriu");
    }

    if (resultado.tipo === "recusada") {
      const status = resultado.erro.code === "musica.interacao_fechada" ? 403 : 422;
      return erro(status, resultado.erro.code, "Sugestão recusada", resultado.erro.details);
    }

    console.log("musica.sugestao", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      provedor: link.provedor,
    });

    const sugestoes = resultado.fila.map((f) => ({
      provedor: f.link.provedor,
      tipo: f.link.tipo,
      url: f.link.url,
      votos: votos(f),
    }));

    return ok({ aceita: true, sugestoes });
  } catch (e) {
    return erroInesperado("musica.post", e);
  }
}
