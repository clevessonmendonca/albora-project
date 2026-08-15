import type { EventoDoFunil } from "@albora/core";
import { comEvento, registrarEntradaDoFunil, registrarEventoDoFunil } from "@albora/db";
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
    await comEvento(getPool(), eventId, (c) =>
      registrarEventoDoFunil(c, { sessaoId: sessionId, name }),
    );
  } catch (e) {
    console.error("funil.falhou", { eventoId: eventId, name, erro: String(e) });
  }
}

export async function recordFunnelEntry(eventId: string, sessionId: string): Promise<void> {
  try {
    await comEvento(getPool(), eventId, (c) => registrarEntradaDoFunil(c, sessionId));
  } catch (e) {
    console.error("funil.falhou", { eventoId: eventId, name: "entrada", erro: String(e) });
  }
}

