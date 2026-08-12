/**
 * Comentário em foto, com resposta (spec 014, ADR 0009).
 *
 * Três coisas vêm de fora e não são reimplementadas aqui: o gate de interação
 * (`interacao.ts`), a precedência de moderação (`moderacao.ts`) e a regra de
 * quem remove o quê (`galeria.ts`). Gate reimplementado é gate que abre em
 * horário diferente; precedência reimplementada é o botão de pânico valendo
 * para foto e não valendo para o texto embaixo dela.
 *
 * Reação em comentário não existe, em nenhuma fase — é decisão de escopo da
 * spec, não lacuna de implementação.
 */

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

/**
 * Uma resposta, e só. Resposta de resposta pendura na mesma raiz.
 *
 * Thread infinita é duas superfícies ruins ao mesmo tempo: de render, porque
 * o quinto nível não cabe num celular de 360px, e de abuso, porque enterrar
 * texto sob dez níveis é o jeito barato de escapar de quem está moderando. O
 * teto também é o que a superfície lê para saber quanto indentar.
 */
export const PROFUNDIDADE_MAXIMA = 1;

export type CodigoDeComentario =
  | "comentario.outro_evento"
  | "comentario.gate_fechado"
  | "comentario.texto_vazio"
  | "comentario.texto_longo"
  | "comentario.resposta_ausente";

/* ── texto ──────────────────────────────────────────────────────────── */

/**
 * O que o convidado digitou não vira nada visível.
 *
 * Espaço comum o `trim` resolve; junta-linhas, marca de direção e espaço de
 * largura zero não, e um comentário só deles renderiza em branco na foto de
 * alguém — que é exatamente o que serve para poluir sem dar o que denunciar.
 */
const INVISIVEIS = /[\s\u00AD\u180E\u200B-\u200F\u2060\uFEFF]/gu;

export type TextoValidado =
  | { ok: true; texto: string }
  | { ok: false; codigo: "comentario.texto_vazio" | "comentario.texto_longo" };

/**
 * Devolve o texto aparado, **sem escapar**.
 *
 * Escapar aqui gravaria `&lt;script&gt;` no banco e voltaria escapado de novo
 * no template — o convidado veria a própria entidade HTML na tela. As duas
 * camadas da spec são servidor e template, as duas na saída.
 */
export function validarTexto(bruto: string): TextoValidado {
  const texto = bruto.trim();

  if (texto.replace(INVISIVEIS, "") === "") {
    return { ok: false, codigo: "comentario.texto_vazio" };
  }

  // Ponto de código, não unidade UTF-16: contar `.length` cortaria um
  // comentário de emoji na metade do teto e partiria o par substituto.
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

  // Um código só para "não existe", "é de outra foto" e "é de outro evento".
  // Separar os três responderia, para quem tentasse ids no escuro, se um id
  // alheio existe em algum lugar.
  if (alvo === undefined) return { ok: false, codigo: "comentario.resposta_ausente" };

  // Sobe para a raiz em vez de recusar: quem toca em "responder" numa resposta
  // não pode encontrar erro às 22h. Rende no máximo `PROFUNDIDADE_MAXIMA`
  // porque `alvo.respostaA`, quando existe, já é a raiz.
  return { ok: true, respostaA: alvo.respostaA ?? alvo.id };
}

export function publicarComentario(
  pedido: PedidoDeComentario,
  evento: EventoDoComentario,
  existentes: readonly Comentario[],
  agora: Date,
): ResultadoDePublicacao {
  // Isolamento antes do gate: recusar sessão de outro evento sem antes contar
  // se a interação daqui já abriu.
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

/**
 * Agrupa em raízes e respostas, do mais antigo para o mais novo.
 *
 * Recebe apenas o que `decidirExibicaoDoComentario` já liberou: resposta cuja
 * raiz não está na lista **some junto**, em vez de ser promovida a topo — o
 * anfitrião que apagou o comentário de cima não pode ver a discussão dele
 * ressuscitar sem o começo.
 */
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

/**
 * O autor remove o próprio, o anfitrião remove qualquer um — dentro do evento
 * dele. O papel de anfitrião não atravessa evento: sem a checagem de
 * `eventoId`, um anfitrião apagaria comentário da festa de outro casal.
 */
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

/**
 * O comentário chega junto com a foto, para quem não escolheu lê-lo item a
 * item. É a mesma passividade do telão, e é por ela que a denúncia tira
 * comentário da vista sem esperar ninguém acordar.
 */
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

  // A única divergência em relação à mídia, e é a regra do caminho crítico
  // aplicada a texto: classificador mudo é enriquecimento fora do ar, e
  // enriquecimento degrada, nunca derruba. O código estável continua o mesmo
  // para a auditoria registrar que publicou sem parecer do classificador.
  if (decisao.codigo === "moderacao.classificador_sem_resposta") {
    return { visivel: true, codigo: decisao.codigo };
  }

  return decisao;
}

/**
 * A mesma escada de `decidirExibicao`, aplicada duas vezes: primeiro à foto,
 * depois ao comentário. É o que faz o botão de pânico e a remoção da foto
 * levarem os comentários dela junto sem uma segunda regra para manter em dia.
 */
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

/**
 * A linha de auditoria de uma decisão sobre comentário.
 *
 * Não existe campo para o texto, e é de propósito: comentário de festa cita
 * nome de gente que nunca abriu o produto, e a auditoria guarda a decisão, não
 * a frase. Quem precisar da frase busca pelo `comentarioId`, sob a mesma RLS.
 */
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
