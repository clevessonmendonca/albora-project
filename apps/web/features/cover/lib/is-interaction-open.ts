import type { EventoPublico } from "@albora/db";

export function isInteractionOpen(event: EventoPublico, now = Date.now()): boolean {
  return event.interacaoAbreEm === null || event.interacaoAbreEm.getTime() <= now;
}
