import type { MarcosDePreparo } from "@albora/db";

/**
 * De onde o tour retoma. `null` = não mostrar.
 *
 * `true` no marco significa "terminou ou pulou", e nunca mais volta — um tour
 * que reaparece depois de descartado é propaganda, não ajuda. Na fase Depois
 * também não abre: apresentar a festa a quem já a viveu é ruído.
 */
export function passoDoTour(marcos: MarcosDePreparo, depois: boolean): number | null {
  if (depois) return null;
  const tour = marcos.tour;
  if (tour === true) return null;
  if (typeof tour === "number" && Number.isInteger(tour) && tour >= 0) return tour;
  return 0;
}
