import { podeRemover } from "./galeria";
import { interacaoAberta, type GateDeInteracao } from "./interacao";
import {
  decidirExibicao,
  type CodigoDeModeracao,
  type Decisao,
  type EstadoDaMidia,
  type EstadoDoEvento,
  type Superficie,
  type VeredictoDoClassificador,
} from "./moderacao";

export type Comentario = {
  id: string;
  eventoId: string;
  midiaId: string;
  sessaoId: string;
  texto: string;
  /** `null` é comentário de topo. Preenchido é resposta, sempre à raiz. */
  respostaA: string | null;
  criadoEm: Date;
};

export const MAX_CARACTERES = 500;

/** Resposta de resposta pendura na mesma raiz — thread infinita é veículo de abuso e impossível de indentar. */
export const PROFUNDIDADE_MAXIMA = 1;

export type CodigoDeComentario =
  | "comentario.outro_evento"
  | "comentario.gate_fechado"
  | "comentario.texto_vazio"
  | "comentario.texto_longo"
  | "comentario.resposta_ausente";

/* ── texto ──────────────────────────────────────────────────────────── */

/** Zero-width e marcas de direção renderizam em branco — poluem sem dar o que denunciar. */
const INVISIVEIS = /[\s\u00AD\u180E\u200B-\u200F\u2060\uFEFF]/gu;

export type TextoValidado =
  | { ok: true; texto: string }
  | { ok: false; codigo: "comentario.texto_vazio" | "comentario.texto_longo" };

/** Não escapa — gravar `&lt;script&gt;` no banco devolveria a entidade HTML na tela; XSS é responsabilidade do template. */
export function validarTexto(bruto: string): TextoValidado {
  const texto = bruto.trim();

  if (texto.replace(INVISIVEIS, "") === "") {
    return { ok: false, codigo: "comentario.texto_vazio" };
  }

  // Ponto de código, não `.length` (UTF-16): `.length` partiria par substituto de emoji na metade do teto.
  if ([...texto].length > MAX_CARACTERES) {
    return { ok: false, codigo: "comentario.texto_longo" };
  }

  return { ok: true, texto };
}

/* ── publicação ─────────────────────────────────────────────────────── */

export type EventoDoComentario = GateDeInteracao & { id: string };

export type PedidoDeComentario = {
  id: string;
  /** Vem da sessão, derivado no servidor. O cliente não escolhe o evento. */
  eventoId: string;
  midiaId: string;
  sessaoId: string;
  texto: string;
  respostaA: string | null;
};

export type ResultadoDePublicacao =
  | { ok: true; comentario: Comentario }
  | { ok: false; codigo: CodigoDeComentario };

function ancoraDaResposta(
  existentes: readonly Comentario[],
  pedido: PedidoDeComentario,
): { ok: true; respostaA: string | null } | { ok: false; codigo: CodigoDeComentario } {
  if (pedido.respostaA === null) return { ok: true, respostaA: null };

  const alvo = existentes.find(
    (c) =>
      c.id === pedido.respostaA &&
      c.eventoId === pedido.eventoId &&
      c.midiaId === pedido.midiaId,
  );

  // Um código para os três casos — separar revelaria, por enumeração, se um id alheio existe em algum lugar.
  if (alvo === undefined) return { ok: false, codigo: "comentario.resposta_ausente" };

  // Sobe para a raiz — reply em reply nunca gera erro às 22h; `alvo.respostaA` já é raiz quando existe.
  return { ok: true, respostaA: alvo.respostaA ?? alvo.id };
}

export function publicarComentario(
  pedido: PedidoDeComentario,
  evento: EventoDoComentario,
  existentes: readonly Comentario[],
  agora: Date,
): ResultadoDePublicacao {
  // Isolamento antes do gate: evento divergente nunca vaza pelo contador de interação aberta.
  if (pedido.eventoId !== evento.id) {
    return { ok: false, codigo: "comentario.outro_evento" };
  }

  if (!interacaoAberta(evento, agora)) {
    return { ok: false, codigo: "comentario.gate_fechado" };
  }

  const texto = validarTexto(pedido.texto);
  if (!texto.ok) return { ok: false, codigo: texto.codigo };

  const ancora = ancoraDaResposta(existentes, pedido);
  if (!ancora.ok) return { ok: false, codigo: ancora.codigo };

  return {
    ok: true,
    comentario: {
      id: pedido.id,
      eventoId: pedido.eventoId,
      midiaId: pedido.midiaId,
      sessaoId: pedido.sessaoId,
      texto: texto.texto,
      respostaA: ancora.respostaA,
      criadoEm: agora,
    },
  };
}

/* ── thread ─────────────────────────────────────────────────────────── */

export type ThreadDeComentario = {
  raiz: Comentario;
  respostas: Comentario[];
};

function maisAntigoPrimeiro(a: Comentario, b: Comentario): number {
  return a.criadoEm.getTime() - b.criadoEm.getTime() || a.id.localeCompare(b.id);
}

/** Resposta cuja raiz foi removida some junto — anfitrião não pode ver discussão ressuscitar sem começo. */
export function montarThread(
  comentarios: readonly Comentario[],
  midiaId: string,
): ThreadDeComentario[] {
  const daMidia = comentarios.filter((c) => c.midiaId === midiaId);

  const porRaiz = new Map<string, Comentario[]>();
  for (const c of daMidia) {
    if (c.respostaA === null) continue;
    const irmas = porRaiz.get(c.respostaA);
    if (irmas === undefined) porRaiz.set(c.respostaA, [c]);
    else irmas.push(c);
  }

  return daMidia
    .filter((c) => c.respostaA === null)
    .sort(maisAntigoPrimeiro)
    .map((raiz) => ({
      raiz,
      respostas: [...(porRaiz.get(raiz.id) ?? [])].sort(maisAntigoPrimeiro),
    }));
}

/* ── remoção ────────────────────────────────────────────────────────── */

export type AtorDaRemocao = {
  eventoId: string;
  sessaoId: string;
  ehAnfitriao: boolean;
};

/** Papel de anfitrião não atravessa evento — sem checar `eventoId` ele apagaria comentário de outro casal. */
export function podeRemoverComentario(
  comentario: Pick<Comentario, "eventoId" | "sessaoId">,
  ator: AtorDaRemocao,
): boolean {
  if (comentario.eventoId !== ator.eventoId) return false;

  return ator.ehAnfitriao || podeRemover(comentario.sessaoId, ator.sessaoId);
}

/* ── moderação ──────────────────────────────────────────────────────── */

export type EstadoDoComentario = {
  classificador: VeredictoDoClassificador;
  denuncias: number;
  removido: boolean;
  liberadoPeloAnfitriao: boolean;
};

/** Passivo como o telão — denúncia tira da vista sem esperar intervenção manual. */
const SUPERFICIE_DO_COMENTARIO: Superficie = "telao";

function comoMidia(estado: EstadoDoComentario): EstadoDaMidia {
  return {
    classificador: estado.classificador,
    denuncias: estado.denuncias,
    removida: estado.removido,
    liberadaPeloAnfitriao: estado.liberadoPeloAnfitriao,
  };
}

function decidirTexto(estado: EstadoDaMidia, evento: EstadoDoEvento): Decisao {
  const decisao = decidirExibicao(estado, evento, SUPERFICIE_DO_COMENTARIO);

  // Enriquecimento degrada, nunca derruba: sem resposta do classificador o texto publica (código preservado para auditoria).
  if (decisao.codigo === "moderacao.classificador_sem_resposta") {
    return { visivel: true, codigo: decisao.codigo };
  }

  return decisao;
}

/** Aplica `decidirExibicao` à foto e depois ao comentário — pânico e remoção levam os comentários junto. */
export function decidirExibicaoDoComentario(
  comentario: EstadoDoComentario,
  midia: EstadoDaMidia,
  evento: EstadoDoEvento,
): Decisao {
  const daMidia = decidirTexto(midia, evento);
  if (!daMidia.visivel) return daMidia;

  return decidirTexto(comoMidia(comentario), evento);
}

export type EntradaDeAuditoriaDeComentario = {
  eventoId: string;
  midiaId: string;
  comentarioId: string;
  /** Id opaco de sessão, já mascarado por quem chama. Nunca o nome. */
  ator: string;
  visivel: boolean;
  codigo: CodigoDeModeracao;
  em: string;
};

/** Auditoria guarda a decisão, não o texto — comentário cita nome de quem nunca abriu o produto (PII). */
export function registrarDecisaoDoComentario(
  entrada: Omit<EntradaDeAuditoriaDeComentario, "visivel" | "codigo" | "em">,
  decisao: Decisao,
  em: Date,
): EntradaDeAuditoriaDeComentario {
  return {
    eventoId: entrada.eventoId,
    midiaId: entrada.midiaId,
    comentarioId: entrada.comentarioId,
    ator: entrada.ator,
    visivel: decisao.visivel,
    codigo: decisao.codigo,
    em: em.toISOString(),
  };
}
