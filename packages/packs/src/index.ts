export type {
  ChaveVocabulario,
  Pack,
  PackDefinition,
  VocabularyKey,
} from "./tipos";
export {
  CHAVES_DA_LANDING,
  CHAVES_DO_NUCLEO,
  CORE_VOCABULARY_KEYS,
  isValidConfessionPrompt,
  isValidMissionKey,
  isValidPlace,
  isValidReaction,
  landingProblems,
  LANDING_VOCABULARY_KEYS,
  lugarValido,
  missaoValida,
  confessionarioValido,
  packProblems,
  problemasDaLanding,
  problemasDoPack,
  reacaoValida,
  resolvePackText,
  temLandingPropria,
  hasOwnLanding,
  texto,
} from "./tipos";
export { CASAMENTO, WEDDING } from "./casamento";
export { FIFTEEN_YEARS, QUINZE_ANOS } from "./quinze-anos";
export { PRE_CASAMENTO, PRE_WEDDING } from "./pre-casamento";

import { CASAMENTO } from "./casamento";
import { PRE_CASAMENTO } from "./pre-casamento";
import { QUINZE_ANOS } from "./quinze-anos";
import type { Pack } from "./tipos";

export const PACKS: Record<string, Pack> = {
  [CASAMENTO.id]: CASAMENTO,
  [QUINZE_ANOS.id]: QUINZE_ANOS,
  [PRE_CASAMENTO.id]: PRE_CASAMENTO,
};
