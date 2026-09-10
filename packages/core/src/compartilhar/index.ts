export type {
  Autorizacao,
  Caixa,
  CodigoDeCompartilhamento,
  Composicao,
  ConsentimentoExterno,
  ConteudoDaMoldura,
  Dimensoes,
  DimensoesDaComposicao,
  EntradaDaComposicao,
  EventoQueCompartilha,
  FormatoDaMoldura,
  IdentidadeDoEvento,
  MidiaParaCompartilhar,
  ModeloDeMoldura,
  ProblemaDaComposicao,
  Recorte,
  ResultadoDaComposicao,
  SessaoQueCompartilha,
} from "./types";

export {
  ALTURA_DA_COMPOSICAO,
  ALTURA_DA_FAIXA,
  DIMENSOES_DO_FORMATO,
  ESPACO_DA_COLAGEM,
  FORMATOS_DE_MOLDURA,
  LARGURA_DA_COMPOSICAO,
  MARGEM,
  MAX_DA_COLAGEM,
  MAX_PERDA_LATERAL,
  MODELOS_DE_MOLDURA,
  VERSAO_DO_CONSENTIMENTO_EXTERNO,
} from "./types";

export {
  autorizarColagem,
  autorizarCompartilhamento,
  midiasCompartilhaveis,
  pendenciaDeConsentimento,
} from "./autorizacao";

export {
  areaDaFoto,
  caixaDaFoto,
  cobreSemPerderTopo,
  encaixar,
  faixaDaMarca,
  modeloRecomendado,
  modelosDeMolduraPermitidos,
  molduraCorta,
  recorte,
} from "./moldura";

export { conteudoDaMoldura } from "./conteudo";
export { celulasDaColagem, compor, problemasDaComposicao } from "./composicao";
