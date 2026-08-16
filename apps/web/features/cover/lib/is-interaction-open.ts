import { interacaoAberta } from "@albora/core";
import type { EventoPublico } from "@albora/db";

/**
 * Espelha `interacaoAberta` do núcleo: `null` = fechado (espelho).
 * Antes esta helper tratava `null` como aberto e a capa mentia "ao vivo".
 */
export function isInteractionOpen(event: EventoPublico, now = Date.now()): boolean {
  return interacaoAberta(event, new Date(now));
}
