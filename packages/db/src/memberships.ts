import type { Pool, PoolClient } from "pg";
import { comConta } from "./event";

export type EventMemberRole = "couple" | "planner";

/** Papel efetivo no painel: dono da fatura, casal ou cerimonialista. */
export type HostEventRole = "owner" | "couple" | "planner";

export type EventMember = {
  accountId: string;
  email: string;
  role: EventMemberRole;
  createdAt: Date;
};

/**
 * Membro do evento. Fotos ficam com `events.account_id`; papéis operacionais
 * entram aqui (couple | planner).
 */
export async function addEventMember(
  cliente: PoolClient,
  entrada: { eventId: string; accountId: string; role: EventMemberRole },
): Promise<void> {
  await cliente.query(
    `INSERT INTO event_members (event_id, account_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, account_id) DO UPDATE SET role = EXCLUDED.role`,
    [entrada.eventId, entrada.accountId, entrada.role],
  );
}

/**
 * Lista membros do evento (couple | planner) com seus e-mails.
 * 
 * 🔴 IMPORTANTE: RLS de `event_members` só permite ver a própria membership
 * (`conta_membro`). Criar policy cross-account geraria recursão com
 * `conta_membro_evento_leitura` (0034). Por isso a ACL é na aplicação:
 * `requireHostEventRole` valida acesso ANTES de chamar esta função. A query
 * inline reforça a validação como defesa em profundidade, mas a proteção real
 * está na API.
 */
export async function listEventMembers(
  pool: Pool,
  accountId: string,
  eventId: string,
): Promise<EventMember[]> {
  return comConta(pool, accountId, async (c) => {
    const { rows } = await c.query<{
      account_id: string;
      email: string;
      role: string;
      created_at: Date;
    }>(
      `SELECT m.account_id, a.email, m.role, m.created_at
       FROM event_members m
       JOIN accounts a ON a.id = m.account_id
       WHERE m.event_id = $1
         AND (
           EXISTS (SELECT 1 FROM events e WHERE e.id = $1 AND e.account_id = $2)
           OR $2 IN (SELECT account_id FROM event_members WHERE event_id = $1)
         )
       ORDER BY m.created_at ASC`,
      [eventId, accountId],
    );
    return rows.map((r) => ({
      accountId: r.account_id,
      email: r.email,
      role: r.role as EventMemberRole,
      createdAt: r.created_at,
    }));
  });
}

/** Quem cria o evento entra como couple na mesma transação de conta. */
export async function ensureCoupleMember(
  pool: Pool,
  accountId: string,
  eventId: string,
): Promise<void> {
  await comConta(pool, accountId, async (c) => {
    await addEventMember(c, { eventId, accountId, role: "couple" });
  });
}

/**
 * Papel da conta neste evento. `owner` se `events.account_id` casa (equivalente
 * a couple para ACL); senão o papel em `event_members`; senão `null`.
 */
export async function roleForAccountOnEvent(
  pool: Pool,
  accountId: string,
  eventId: string,
): Promise<HostEventRole | null> {
  return comConta(pool, accountId, async (c) => {
    const { rows: owned } = await c.query<{ ok: number }>(
      `SELECT 1 AS ok FROM events WHERE id = $1 AND account_id = $2`,
      [eventId, accountId],
    );
    if (owned[0]) return "owner";

    const { rows: member } = await c.query<{ role: string }>(
      `SELECT role FROM event_members WHERE event_id = $1 AND account_id = $2`,
      [eventId, accountId],
    );
    const role = member[0]?.role;
    if (role === "couple" || role === "planner") return role;
    return null;
  });
}
