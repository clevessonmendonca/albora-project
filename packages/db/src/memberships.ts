import type { Pool, PoolClient } from "pg";
import { comConta } from "./event";

export type EventMemberRole = "couple" | "planner";

/** Papel efetivo no painel: dono da fatura, casal ou cerimonialista. */
export type HostEventRole = "owner" | "couple" | "planner";

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
