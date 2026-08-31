import {
  roleForAccountOnEvent,
  type EventoDoHost,
  type HostEventRole,
} from "@albora/db";
import { getPool } from "@/lib/db";
import { errorResponse } from "./response";
import { requireHostEvent } from "./host-event";

export type { HostEventRole };

/** Casal / dono da fatura: ZIP, haMenores, billing, identidade, apagar. */
export const COUPLE_HOST_ROLES: readonly HostEventRole[] = ["owner", "couple"];

/** Qualquer membro do painel (inclui cerimonialista). */
export const ANY_HOST_ROLES: readonly HostEventRole[] = ["owner", "couple", "planner"];

export async function requireHostEventRole(
  accountId: string,
  eventoId: string,
  allowed: readonly HostEventRole[],
): Promise<{ evento: EventoDoHost; role: HostEventRole } | Response> {
  const role = await roleForAccountOnEvent(getPool(), accountId, eventoId);
  if (!role) {
    return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
  }
  if (!allowed.includes(role)) {
    return errorResponse(403, "host.papel_negado", "Sem permissão para esta ação");
  }

  const owned = await requireHostEvent(accountId, eventoId);
  if (owned instanceof Response) return owned;

  return { evento: owned.evento, role };
}
