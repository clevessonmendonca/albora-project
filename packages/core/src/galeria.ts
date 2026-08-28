import { MAX_ATTEMPTS } from "./fila";
import type { QueueItem } from "./fila";
import type { GateDeInteracao } from "./interacao";

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
    // Idempotência: entre confirm e limpeza da fila o item existe nos dois lados — sem isso aparece em dobro para o convidado.
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

/** Reação nunca espera o gate (ADR 0009); comentário espera. As duas superfícies leem esta função. */
export function podeReagir(_evento: GateDeInteracao, _agora: Date): boolean {
  return true;
}

export type Reacao = {
  sessaoId: string;
  midiaId: string;
  tipo: string;
};

/** Idempotente por (sessaoId, midiaId): toque duplo e retry não inflam contagem. */
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

/** ADR 0004: o token autoriza remover só a própria mídia. */
export function podeRemover(midiaDaSessao: string, sessaoId: string): boolean {
  return midiaDaSessao === sessaoId;
}
