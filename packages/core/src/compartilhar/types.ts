import type { CodigoDeModeracao, EstadoDaMidia, EstadoDoEvento } from "../moderacao";

export type CodigoDeCompartilhamento =
  | "compartilhar.autorizado"
  | "compartilhar.evento_diferente"
  | "compartilhar.nao_e_autor"
  | "compartilhar.desligado_pelo_anfitriao"
  | "compartilhar.sem_consentimento_externo"
  | "compartilhar.consentimento_desatualizado"
  | "compartilhar.consentimento_sem_data"
  | "compartilhar.consentimento_revogado"
  | "compartilhar.bloqueado_pela_moderacao"
  | "compartilhar.modelo_corta_a_foto"
  | "compartilhar.colagem_vazia"
  | "compartilhar.colagem_grande_demais";

export const VERSAO_DO_CONSENTIMENTO_EXTERNO = "externo-v1";

export type ConsentimentoExterno = {
  versao: string;
  em: Date;
  revogadoEm: Date | null;
  nomeNaMoldura: boolean;
};

export type SessaoQueCompartilha = {
  sessaoId: string;
  eventoId: string;
  nome: string;
  consentimentoDeEntrada: { versao: string; em: Date };
  consentimentoExterno: ConsentimentoExterno | null;
};

export type MidiaParaCompartilhar = {
  id: string;
  eventoId: string;
  sessaoDeOrigem: string;
  largura: number;
  altura: number;
  legenda: string | null;
  estado: EstadoDaMidia;
};

export type EventoQueCompartilha = EstadoDoEvento & {
  compartilhamentoExternoLiberado: boolean;
};

export type Autorizacao = {
  pode: boolean;
  codigo: CodigoDeCompartilhamento;
  motivoDaModeracao: CodigoDeModeracao | null;
};

export type Dimensoes = { largura: number; altura: number };

export type Caixa = { x: number; y: number; largura: number; altura: number };

export type ModeloDeMoldura = "polaroide" | "ambiente" | "cheia";

export type Recorte = { topo: number; base: number; esquerda: number; direita: number };

export type IdentidadeDoEvento = {
  monograma: string;
  titulo: string;
  data: string;
  slug: string;
};

export type ConteudoDaMoldura = {
  monograma: string;
  titulo: string;
  data: string;
  slug: string;
  legenda: string | null;
  credito: string | null;
};

export type Composicao = {
  largura: number;
  altura: number;
  modelo: ModeloDeMoldura;
  area: Caixa;
  foto: Caixa;
  faixa: Caixa;
  conteudo: ConteudoDaMoldura;
};

export type EntradaDaComposicao = {
  midia: MidiaParaCompartilhar;
  sessao: SessaoQueCompartilha;
  evento: EventoQueCompartilha;
  identidade: IdentidadeDoEvento;
  modelo: ModeloDeMoldura;
  agora: Date;
};

export type ResultadoDaComposicao =
  | { autorizada: true; codigo: "compartilhar.autorizado"; composicao: Composicao }
  | {
      autorizada: false;
      codigo: CodigoDeCompartilhamento;
      motivoDaModeracao: CodigoDeModeracao | null;
      composicao: null;
    };

export type ProblemaDaComposicao =
  | "recorte.topo"
  | "recorte.base"
  | "recorte.lateral"
  | "marca.sobre_a_foto";

export const MAX_DA_COLAGEM = 4;

export const LARGURA_DA_COMPOSICAO = 1080;
export const ALTURA_DA_COMPOSICAO = 1920;
export const ALTURA_DA_FAIXA = 320;
export const MARGEM = 64;
export const ESPACO_DA_COLAGEM = 16;
export const MAX_PERDA_LATERAL = 0.15;

export const MODELOS_DE_MOLDURA: readonly ModeloDeMoldura[] = [
  "polaroide",
  "ambiente",
  "cheia",
];
