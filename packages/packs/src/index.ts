export type { ChaveVocabulario, Pack } from "./tipos";
export { CHAVES_DO_NUCLEO, lugarValido, problemasDoPack, texto } from "./tipos";
export { CASAMENTO } from "./casamento";
export { QUINZE_ANOS } from "./quinze-anos";

import { CASAMENTO } from "./casamento";
import { QUINZE_ANOS } from "./quinze-anos";
import type { Pack } from "./tipos";

export const PACKS: Record<string, Pack> = {
  [CASAMENTO.id]: CASAMENTO,
  [QUINZE_ANOS.id]: QUINZE_ANOS,
};
