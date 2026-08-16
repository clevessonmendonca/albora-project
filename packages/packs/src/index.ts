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
  texto,
} from "./tipos";
export { CASAMENTO, WEDDING } from "./casamento";
export { FIFTEEN_YEARS, QUINZE_ANOS } from "./quinze-anos";

import { CASAMENTO } from "./casamento";
import { QUINZE_ANOS } from "./quinze-anos";
import type { Pack } from "./tipos";

export const PACKS: Record<string, Pack> = {
  [CASAMENTO.id]: CASAMENTO,
  [QUINZE_ANOS.id]: QUINZE_ANOS,
};
