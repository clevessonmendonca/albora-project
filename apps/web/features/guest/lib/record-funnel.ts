import type { EventoDoFunil, EntryVia } from "@albora/core";
import { withEvent, recordFunnelEvent as insertFunnelEvent, recordFunnelEntry as insertFunnelEntry } from "@albora/db";
import { getPool } from "@/lib/db";

/**
 * Telemetria do funil: nunca quebra o caminho do convidado.
 *
 * Transação própria, fora do confirm e da criação de sessão. Se o INSERT
 * falhar, a foto e o token já estão salvos — e o painel fica cego daquele
 * passo, não o sábado inteiro.
 */
export async function recordFunnelEvent(
  eventId: string,
  sessionId: string,
  name: EventoDoFunil,
): Promise<void> {
  try {
    await withEvent(getPool(), eventId, (c) =>
      insertFunnelEvent(c, { sessaoId: sessionId, name }),
    );
  } catch (e) {
    console.error("funil.falhou", { eventoId: eventId, name, erro: String(e) });
  }
}

export async function recordFunnelEntry(
  eventId: string,
  sessionId: string,
  via: EntryVia,
): Promise<void> {
  try {
    await withEvent(getPool(), eventId, (c) => insertFunnelEntry(c, sessionId, via));
  } catch (e) {
    console.error("funil.falhou", { eventoId: eventId, name: "entrada", erro: String(e) });
  }
}

