import type { Pool, PoolClient } from "pg";
import { comConta } from "./event";

export type SupportPriority = "p0" | "p1" | "p2";
export type SupportStatus = "open" | "pending" | "resolved" | "closed";

export type SupportTicket = {
  id: string;
  accountId: string;
  eventId: string | null;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  slaDueAt: Date | null;
  createdAt: Date;
};

const SLA_HOURS: Record<SupportPriority, number> = {
  p0: 0.25,
  p1: 4,
  p2: 24,
};

export function slaDueAt(priority: SupportPriority, from = new Date()): Date {
  return new Date(from.getTime() + SLA_HOURS[priority] * 3600 * 1000);
}

export async function createSupportTicket(
  pool: Pool,
  accountId: string,
  entrada: {
    eventId?: string | null;
    subject: string;
    body: string;
    priority?: SupportPriority;
    source?: "admin" | "email" | "ops";
  },
): Promise<SupportTicket> {
  const priority = entrada.priority ?? "p2";
  const due = slaDueAt(priority);

  return comConta(pool, accountId, async (c) => {
    const { rows } = await c.query<{
      id: string;
      account_id: string;
      event_id: string | null;
      subject: string;
      status: SupportStatus;
      priority: SupportPriority;
      sla_due_at: Date | null;
      created_at: Date;
    }>(
      `INSERT INTO support_tickets (account_id, event_id, source, subject, priority, sla_due_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, account_id, event_id, subject, status, priority, sla_due_at, created_at`,
      [
        accountId,
        entrada.eventId ?? null,
        entrada.source ?? "admin",
        entrada.subject.slice(0, 200),
        priority,
        due,
      ],
    );
    const t = rows[0]!;
    await c.query(
      `INSERT INTO support_messages (ticket_id, author_kind, author_account_id, body)
       VALUES ($1, 'host', $2, $3)`,
      [t.id, accountId, entrada.body.slice(0, 4000)],
    );
    return {
      id: t.id,
      accountId: t.account_id,
      eventId: t.event_id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      slaDueAt: t.sla_due_at,
      createdAt: t.created_at,
    };
  });
}

export async function listSupportTicketsForAccount(
  pool: Pool,
  accountId: string,
): Promise<SupportTicket[]> {
  return comConta(pool, accountId, async (c: PoolClient) => {
    const { rows } = await c.query<{
      id: string;
      account_id: string;
      event_id: string | null;
      subject: string;
      status: SupportStatus;
      priority: SupportPriority;
      sla_due_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, account_id, event_id, subject, status, priority, sla_due_at, created_at
         FROM support_tickets
        ORDER BY created_at DESC
        LIMIT 50`,
    );
    return rows.map((t) => ({
      id: t.id,
      accountId: t.account_id,
      eventId: t.event_id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      slaDueAt: t.sla_due_at,
      createdAt: t.created_at,
    }));
  });
}

/** Lê sob `app.account_id` + política `ops_ticket_lista` — sem BYPASSRLS no caminho do Next. */
export async function listOpenSupportTicketsAdmin(
  pool: Pool,
  operatorAccountId: string,
  limit = 50,
): Promise<SupportTicket[]> {
  return comConta(pool, operatorAccountId, async (c: PoolClient) => {
    const { rows } = await c.query<{
      id: string;
      account_id: string;
      event_id: string | null;
      subject: string;
      status: SupportStatus;
      priority: SupportPriority;
      sla_due_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, account_id, event_id, subject, status, priority, sla_due_at, created_at
         FROM support_tickets
        WHERE status IN ('open', 'pending')
        ORDER BY
          CASE priority WHEN 'p0' THEN 0 WHEN 'p1' THEN 1 ELSE 2 END,
          created_at ASC
        LIMIT $1`,
      [limit],
    );
    return rows.map((t) => ({
      id: t.id,
      accountId: t.account_id,
      eventId: t.event_id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      slaDueAt: t.sla_due_at,
      createdAt: t.created_at,
    }));
  });
}

export async function listSupportTicketsForEvent(
  pool: Pool,
  operatorAccountId: string,
  eventId: string,
): Promise<SupportTicket[]> {
  return comConta(pool, operatorAccountId, async (c: PoolClient) => {
    const { rows } = await c.query<{
      id: string;
      account_id: string;
      event_id: string | null;
      subject: string;
      status: SupportStatus;
      priority: SupportPriority;
      sla_due_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, account_id, event_id, subject, status, priority, sla_due_at, created_at
         FROM support_tickets
        WHERE event_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [eventId],
    );
    return rows.map((t) => ({
      id: t.id,
      accountId: t.account_id,
      eventId: t.event_id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      slaDueAt: t.sla_due_at,
      createdAt: t.created_at,
    }));
  });
}

export async function isPlatformOperator(pool: Pool, accountId: string): Promise<boolean> {
  return comConta(pool, accountId, async (c) => {
    const { rows } = await c.query(`SELECT 1 FROM platform_operators WHERE account_id = $1`, [
      accountId,
    ]);
    return rows.length > 0;
  });
}
