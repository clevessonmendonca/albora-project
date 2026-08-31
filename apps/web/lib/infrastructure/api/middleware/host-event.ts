import { buscarEventoDoHost, type EventoDoHost } from "@albora/db";
import { getPool } from "@/lib/db";
import { errorResponse } from "./response";

export async function requireHostEvent(
  accountId: string,
  eventoId: string,
): Promise<{ evento: EventoDoHost } | Response> {
  const evento = await buscarEventoDoHost(getPool(), accountId, eventoId);
  if (!evento) {
    return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
  }
  return { evento };
}
