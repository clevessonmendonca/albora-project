import type { Pool } from "pg";
import { hasCapability, type Actor } from "@albora/core";
import { getSupportTicketAdmin } from "@albora/db";
import { listAccounts } from "../accounts/list-accounts";
import { listEvents } from "../events/list-events";
import { withPlatformAggregation } from "../platform/aggregation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_POR_CATEGORIA = 5;

export type ConsoleSearchResultKind = "account" | "event" | "ticket";
export type ConsoleSearchResult = { kind: ConsoleSearchResultKind; id: string; label: string; href: string };
export type SearchConsoleInput = { actor: Actor; reason: string; query: string };

/**
 * ⌘K (spec de design §12, primitivo de Onda D). Nunca uma query nova
 * cross-tenant — reaproveita `listAccounts`/`listEvents` (já sob
 * `withPlatformAggregation`, Onda B) e envolve `getSupportTicketAdmin` na
 * mesma disciplina aqui mesmo, porque não existe caso de uso de ler UM
 * ticket por id fora de `getTicketDetail` (que traz thread e contexto
 * inteiros — pesado demais para um resultado de busca).
 *
 * "Quem não tem accounts.read não encontra conta na busca" é literal: a
 * categoria nem tenta rodar — `hasCapability` decide ANTES de chamar
 * `listAccounts`/`listEvents`, que lançariam `CommandDeniedError` se
 * chamados sem a capacidade. Silêncio, não erro.
 *
 * Busca de ticket é por id exato (uuid) — não existe coluna de busca
 * textual em `support_tickets` (reconhecimento da Onda D, item 12).
 * Buscar pelo assunto do ticket não encontra nada; é lacuna registrada,
 * não inventada.
 */
export async function searchConsole(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: SearchConsoleInput,
): Promise<ConsoleSearchResult[]> {
  const query = input.query.trim();
  if (query.length < 2) return [];

  const resultados: ConsoleSearchResult[] = [];

  if (hasCapability(input.actor.roles, "accounts.read")) {
    const { rows } = await listAccounts(deps, {
      actor: input.actor,
      reason: input.reason,
      search: query,
      limit: LIMITE_POR_CATEGORIA,
    });
    resultados.push(
      ...rows.map((r) => ({
        kind: "account" as const,
        id: r.id,
        label: r.maskedEmail,
        href: `/console/accounts/${r.id}`,
      })),
    );
  }

  if (hasCapability(input.actor.roles, "events.read")) {
    const { rows } = await listEvents(deps, {
      actor: input.actor,
      reason: input.reason,
      search: query,
      limit: LIMITE_POR_CATEGORIA,
    });
    resultados.push(
      ...rows.map((r) => ({
        kind: "event" as const,
        id: r.id,
        label: r.title ?? r.id,
        href: `/console/events/${r.id}`,
      })),
    );
  }

  if (hasCapability(input.actor.roles, "tickets.read") && UUID.test(query)) {
    const ticket = await withPlatformAggregation(deps, {
      actor: input.actor,
      capability: "tickets.read",
      reason: input.reason,
      action: "tickets.search.read",
      run: () => getSupportTicketAdmin(deps.aggregatorPool, query),
    });
    if (ticket) {
      resultados.push({ kind: "ticket", id: ticket.id, label: ticket.subject, href: `/console/support?ticket=${ticket.id}` });
    }
  }

  return resultados;
}
