import type { Pool, PoolClient } from "pg";
import { comConta } from "./event";

export type EventMemberRole = "couple" | "planner";

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
