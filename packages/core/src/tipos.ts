/** Nenhum identificador contém palavra de domínio (`noiva`, `casamento`, …) — isso vive no pack. Trocar o pack muda toda a UI sem tocar aqui. */

export type EventoId = string & { readonly __marca: "EventoId" };
export type SessaoId = string & { readonly __marca: "SessaoId" };
export type MidiaId = string & { readonly __marca: "MidiaId" };

export type Evento = {
  id: EventoId;
  slug: string;
  packId: string;
  comecaEm: Date;
  terminaEm: Date;
  /** Quando reação e comentário abrem. `null` = fechados (ADR 0009). */
  interacaoAbreEm: Date | null;
};

export type Sessao = {
  id: SessaoId;
  eventoId: EventoId;
  nome: string;
  consentimentoVersao: string;
  consentimentoEm: Date;
};

export type Missao = {
  id: string;
  /** Chave de vocabulário resolvida pelo pack. Nunca texto pronto. */
  chaveTitulo: string;
  ordem: number;
};

export type Midia = {
  id: MidiaId;
  eventoId: EventoId;
  sessaoId: SessaoId;
  chave: string;
  missaoId: string | null;
  legenda: string | null;
  criadaEm: Date;
};
