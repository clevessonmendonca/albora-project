import { MAX_ATTEMPTS } from "./fila";
import type { QueueItem } from "./fila";
import type { GateDeInteracao } from "./interacao";

/**
 * A galeria pessoal e a reação (spec 008).
 *
 * As duas resolvem coisas diferentes, e a galeria é a que justifica a semana:
 * o convidado subiu oito fotos numa festa com sinal ruim e não faz ideia se
 * chegaram. Sem um lugar que diga "as suas oito estão aqui", ele para de
 * mandar **por dúvida, não por desinteresse**.
 *
 * Por isso a fila local entra na mesma lista do que já está no servidor. Uma
 * galeria que só mostra o confirmado responde à pergunta errada.
 */

export type EstadoNaGaleria = "enviada" | "subindo" | "falhou";

export type MidiaEnviada = {
  id: string;
  chave: string;
  criadaEm: Date;
};

export type ItemDaGaleria = {
  id: string;
  estado: EstadoNaGaleria;
  criadaEm: Date;
  /** Presente só quando o servidor já confirmou. */
  chave: string | null;
  /** Quantas vezes já tentou subir. Zero para o que já está no servidor. */
  tentativas: number;
};

/**
 * Junta o que o servidor confirmou com o que ainda está na fila do aparelho.
 *
 * A prova 5 da spec — matar o app com 3 pendentes, reabrir e ver os 3 ainda
 * marcados — só passa porque a fila é a fonte da verdade do que não subiu, e
 * ela sobrevive ao fechamento do app.
 *
 * Ordena da mais nova para a mais velha, misturando as duas origens: separar
 * "as suas" de "as pendentes" em duas listas obrigaria o convidado a somar de
 * cabeça para responder "mandei tudo?".
 */
export function montarGaleria(
  enviadas: readonly MidiaEnviada[],
  fila: readonly QueueItem[],
  eventoId: string,
): ItemDaGaleria[] {
  const doServidor: ItemDaGaleria[] = enviadas.map((m) => ({
    id: m.id,
    estado: "enviada",
    criadaEm: m.criadaEm,
    chave: m.chave,
    tentativas: 0,
  }));

  const confirmadas = new Set(enviadas.map((m) => m.id));

  const daFila: ItemDaGaleria[] = fila
    .filter((i) => i.eventoId === eventoId)
    // O confirm é idempotente pelo id do cliente: entre o `confirm` e a
    // limpeza da fila o mesmo item existe nos dois lados, e mostrá-lo duas
    // vezes faria o convidado achar que mandou em dobro.
    .filter((i) => !confirmadas.has(i.id))
    .map((i) => ({
      id: i.id,
      estado: i.tentativas >= MAX_ATTEMPTS ? "falhou" : "subindo",
      criadaEm: new Date(i.criadoEm),
      chave: null,
      tentativas: i.tentativas,
    }));

  return [...doServidor, ...daFila].sort(
    (a, b) => b.criadaEm.getTime() - a.criadaEm.getTime(),
  );
}

export type ResumoDaGaleria = {
  total: number;
  enviadas: number;
  subindo: number;
  falhou: number;
};

export function resumirGaleria(itens: readonly ItemDaGaleria[]): ResumoDaGaleria {
  return {
    total: itens.length,
    enviadas: itens.filter((i) => i.estado === "enviada").length,
    subindo: itens.filter((i) => i.estado === "subindo").length,
    falhou: itens.filter((i) => i.estado === "falhou").length,
  };
}

/* ── reação ─────────────────────────────────────────────────────────── */

/**
 * O botão de reagir nunca espera o gate — só o comentário espera (ADR 0009,
 * atualizado). Reagir é o gesto mais barato que existe no app e é ele quem dá
 * ao convidado o primeiro sinal de "chegou" antes mesmo de a interação abrir;
 * segue em `podeReagir`, e não inline nos dois call sites (rota de reação e
 * feed), porque as duas superfícies leem a mesma resposta — é o mesmo motivo
 * que já valia quando a regra era o inverso.
 *
 * `evento`/`agora` seguem na assinatura porque este é o par de `modoInteracao`
 * que os dois call sites já chamam com esses argumentos; usá-los aqui de novo
 * um dia (por exemplo, se a moderação global precisar suspender reação sem
 * mudar o gate de comentário) não pede assinatura nova.
 */
export function podeReagir(_evento: GateDeInteracao, _agora: Date): boolean {
  return true;
}

export type Reacao = {
  sessaoId: string;
  midiaId: string;
  tipo: string;
};

/**
 * Idempotente por `(sessaoId, midiaId)`: reagir duas vezes é reagir uma vez.
 *
 * É o que faz o botão sobreviver a toque duplo e a retry de rede sem inflar
 * contagem — a prova 1 da spec. Trocar o tipo **substitui**, e não soma: uma
 * sessão tem no máximo uma reação por foto.
 */
export function aplicarReacao(
  reacoes: readonly Reacao[],
  nova: Reacao,
): Reacao[] {
  const outras = reacoes.filter(
    (r) => !(r.sessaoId === nova.sessaoId && r.midiaId === nova.midiaId),
  );
  return [...outras, nova];
}

export function removerReacao(
  reacoes: readonly Reacao[],
  sessaoId: string,
  midiaId: string,
): Reacao[] {
  return reacoes.filter((r) => !(r.sessaoId === sessaoId && r.midiaId === midiaId));
}

export function contarReacoes(reacoes: readonly Reacao[], midiaId: string): number {
  return reacoes.filter((r) => r.midiaId === midiaId).length;
}

/**
 * Quem pode remover a mídia.
 *
 * O token do convidado autoriza remover **a própria** mídia, e nada além
 * (ADR 0004). A verificação 7 da spec roda isto contra banco real; aqui é a
 * mesma regra, no lugar onde as duas superfícies a leem.
 */
export function podeRemover(midiaDaSessao: string, sessaoId: string): boolean {
  return midiaDaSessao === sessaoId;
}
