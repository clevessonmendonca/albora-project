export type MidiaDoAlbum = {
  id: string;
  sessaoId: string;
  capturadaEm: Date | null;
  recebidaEm: Date;
  largura: number;
  altura: number;
  lugarId: string | null;
  missaoId: string | null;
  reacoes: number;
};

export type JanelaDoEvento = {
  comecaEm: Date;
  terminaEm: Date;
  offsetMinutos: number;
};

export const FOLGA_DA_JANELA_MS = 3 * 60 * 60 * 1000;

/** Offset de `America/Sao_Paulo`, o default da coluna `events.timezone`. */
export const OFFSET_PADRAO_MINUTOS = -180;

export const CAPITULO_SEM_HORA = "sem-hora";
export const CAPITULO_UNICO = "a-noite";

export const HORAS_DO_AMANHECER: readonly number[] = [5, 6, 7];

export type CapituloPlanejado = {
  id: string;
  comecaEm: Date;
};

export type PlanoDoAlbum = {
  janela: JanelaDoEvento;
  capitulos: readonly CapituloPlanejado[];
  tetoDePaginas: number;
};

export const TETO_DE_PAGINAS_PADRAO = 80;

export const JANELA_DE_RAJADA_MS = 90 * 1000;

export type Instante = { em: Date; confiavel: boolean };

export type MidiaResolvida = MidiaDoAlbum & {
  em: Date;
  horaConfiavel: boolean;
  capituloId: string;
  inicioDaHora: Date | null;
  hora: number | null;
  amanhecer: boolean;
};

export type Proporcao = "retrato" | "paisagem" | "quadrado";

export type Slot = {
  id: string;
  proporcao: Proporcao;
  fracao: number;
};

export type Layout = { id: string; slots: readonly Slot[] };

export type Bloco = {
  capituloId: string;
  inicioDaHora: Date | null;
  hora: number | null;
  amanhecer: boolean;
  lugarId: string | null;
  midias: MidiaResolvida[];
};

export type FotoNaPagina = { slot: Slot; midia: MidiaResolvida };

export type Pagina = {
  capituloId: string;
  layoutId: string;
  inicioDaHora: Date | null;
  hora: number | null;
  amanhecer: boolean;
  lugarId: string | null;
  fotos: FotoNaPagina[];
};

export type Selecao = { mantidas: MidiaResolvida[]; descartadas: MidiaResolvida[] };

export type Contadores = { fotos: number; convidados: number; missoes: number };

export type CapituloDoAlbum = {
  id: string;
  comecaEm: Date | null;
  paginas: Pagina[];
};

export type Album = {
  capitulos: CapituloDoAlbum[];
  totalDePaginas: number;
  contadores: Contadores;
  descartadas: string[];
};
