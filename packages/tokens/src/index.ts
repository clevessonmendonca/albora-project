export type {
  Background,
  BackgroundInput,
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
export { ALBORA_BRAND, MARCA_ALBORA } from "./marca";
export type { ModeloDeIdentidade, ModeloDeIdentidade as IdentityModel } from "./modelos";
export { MODELOS_DE_IDENTIDADE, MODELOS_DE_IDENTIDADE as IDENTITY_MODELS } from "./modelos";
export { escalaDoFundo, escalaDoFundo as scaleForBackground } from "./escalas";
export { normalizeBackground, resolveScale, resolveTokens } from "./resolver";
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
  acentoLegivelSobre as readableAccentOn,
  contraste,
  contraste as contrast,
  CONTRASTE_DE_TEXTO,
  CONTRASTE_DE_TEXTO as TEXT_CONTRAST,
  lerHex,
  lerHex as parseHex,
  luminancia,
  luminancia as luminance,
  misturarHex,
  misturarHex as mixHex,
  paraHex,
  paraHex as toHex,
  textoSobre,
  textoSobre as textOn,
} from "./cor";

/** PT type aliases — compatibilidade com código legado. */
export type {
  Background as Fundo,
  BackgroundInput as FundoEntrada,
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
export {
  normalizeBackground as normalizarFundo,
  resolveScale as resolverEscala,
  resolveTokens as resolverTokens,
} from "./resolver";

/** PT output formatters — compatibilidade com código legado. */
export { toCss as paraCss, toVariables as paraVariaveis } from "./outputs";
