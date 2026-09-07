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
export { ANIVERSARIO, BIRTHDAY } from "./aniversario";
export { FORMATURA, GRADUATION } from "./formatura";
export { CORPORATIVO, CORPORATE } from "./corporativo";
export { CELEBRACAO, CELEBRATION } from "./celebracao";
export { OUTRO } from "./outro";

import { ANIVERSARIO } from "./aniversario";
import { CASAMENTO } from "./casamento";
import { CELEBRACAO } from "./celebracao";
import { CORPORATIVO } from "./corporativo";
import { FORMATURA } from "./formatura";
import { OUTRO } from "./outro";
import { PRE_CASAMENTO } from "./pre-casamento";
import { QUINZE_ANOS } from "./quinze-anos";
import type { Pack } from "./tipos";

export const PACKS: Record<string, Pack> = {
  [CASAMENTO.id]: CASAMENTO,
  [ANIVERSARIO.id]: ANIVERSARIO,
  [FORMATURA.id]: FORMATURA,
  [CORPORATIVO.id]: CORPORATIVO,
  [CELEBRACAO.id]: CELEBRACAO,
  [OUTRO.id]: OUTRO,
  [QUINZE_ANOS.id]: QUINZE_ANOS,
  [PRE_CASAMENTO.id]: PRE_CASAMENTO,
};

/** Os tipos de evento oferecidos no onboarding, na ordem dos cards — só packs que
 *  declaram `ordemCriacao` (ADR 0019). Data, não lista hardcoded no componente. */
export function packsDeCriacao(): Pack[] {
  return Object.values(PACKS)
    .filter((p): p is Pack & { ordemCriacao: number } => p.ordemCriacao !== undefined)
    .sort((a, b) => a.ordemCriacao - b.ordemCriacao);
}

export const creationPacks = packsDeCriacao;
