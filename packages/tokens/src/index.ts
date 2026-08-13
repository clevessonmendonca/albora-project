export type {
  Background,
  Colors,
  Fonts,
  Motion,
  ResolutionInput,
  Scale,
  SemanticScale,
  TokenLayer,
  Tokens,
  Tracking,
} from "./types";
export { MARCA_ALBORA } from "./marca";
export type { ModeloDeIdentidade } from "./modelos";
export { MODELOS_DE_IDENTIDADE } from "./modelos";
export { escalaDoFundo } from "./escalas";
export { resolveScale, resolveTokens } from "./resolver";
export { toCss, toVariables } from "./outputs";
export type { PieceFormat, PieceLayout, PieceMeasures, QrInk } from "./pieces";
export {
  BLEED_MM,
  colorWarning,
  cutBox,
  pieceMeasures,
  pieceProblems,
  QR_CONTRAST_RATIO,
  QR_MIN_MM,
  qrInk,
  SAFE_AREA_MM,
} from "./pieces";
export type { Rgb } from "./cor";
export {
  acentoLegivelSobre,
  contraste,
  CONTRASTE_DE_TEXTO,
  lerHex,
  luminancia,
  paraHex,
  textoSobre,
} from "./cor";

/** PT type aliases — compatibilidade com código legado. */
export type {
  Background as Fundo,
  Colors as Cores,
  Fonts as Fontes,
  Motion as Movimento,
  ResolutionInput as EntradaResolucao,
  Scale as Escala,
  SemanticScale as EscalaSemantica,
  TokenLayer as CamadaTokens,
} from "./types";

/** PT piece types — compatibilidade com código legado. */
export type {
  PieceFormat as FormatoDePeca,
  PieceLayout as LayoutDePeca,
  PieceMeasures as MedidasDaPeca,
  QrInk as TintaDoQr,
} from "./pieces";

/** PT piece helpers — compatibilidade com código legado. */
export {
  BLEED_MM as SANGRIA_MM,
  colorWarning as avisoDeCor,
  cutBox as caixaDeCorte,
  pieceMeasures as medidasDaPeca,
  pieceProblems as problemasDaPeca,
  QR_CONTRAST_RATIO as CONTRASTE_DE_QR,
  QR_MIN_MM as QR_MINIMO_MM,
  qrInk as tintaDoQr,
  SAFE_AREA_MM as AREA_SEGURA_MM,
} from "./pieces";

/** PT resolver — compatibilidade com código legado. */
export { resolveScale as resolverEscala, resolveTokens as resolverTokens } from "./resolver";

/** PT output formatters — compatibilidade com código legado. */
export { toCss as paraCss, toVariables as paraVariaveis } from "./outputs";
