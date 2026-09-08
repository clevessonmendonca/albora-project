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

export type SupportMessageRow = {
  id: string;
  ticketId: string;
  authorKind: "host" | "operator";
  authorAccountId: string | null;
  authorStaffId: string | null;
  body: string;
  createdAt: Date;
};

export type SupportTicketAdmin = SupportTicket & { assigneeStaffId: string | null };

/** Cross-conta por desenho — chamada sob `withPlatformAggregation` (T5), nunca com o pool comum. */
export async function getSupportTicketAdmin(pool: Pool, ticketId: string): Promise<SupportTicketAdmin | null> {
  const { rows } = await pool.query<{
    id: string; account_id: string; event_id: string | null; subject: string;
    status: SupportStatus; priority: SupportPriority; sla_due_at: Date | null;
    created_at: Date; assignee_staff_id: string | null;
  }>(
    `SELECT id, account_id, event_id, subject, status, priority, sla_due_at, created_at, assignee_staff_id
       FROM support_tickets WHERE id = $1`,
    [ticketId],
  );
  const t = rows[0];
  if (!t) return null;
  return {
    id: t.id, accountId: t.account_id, eventId: t.event_id, subject: t.subject,
    status: t.status, priority: t.priority, slaDueAt: t.sla_due_at, createdAt: t.created_at,
    assigneeStaffId: t.assignee_staff_id,
  };
}

/** Cross-conta por desenho — mesma disciplina de `getSupportTicketAdmin`. */
export async function listSupportMessagesAdmin(pool: Pool, ticketId: string): Promise<SupportMessageRow[]> {
  const { rows } = await pool.query<{
    id: string; ticket_id: string; author_kind: "host" | "operator";
    author_account_id: string | null; author_staff_id: string | null; body: string; created_at: Date;
  }>(
    `SELECT id, ticket_id, author_kind, author_account_id, author_staff_id, body, created_at
       FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [ticketId],
  );
  return rows.map((m) => ({
    id: m.id, ticketId: m.ticket_id, authorKind: m.author_kind,
    authorAccountId: m.author_account_id, authorStaffId: m.author_staff_id, body: m.body, createdAt: m.created_at,
  }));
}

/** Roda dentro da tx de `executeCommand` — exige `app.staff_command` (migration 0063). */
export async function respondSupportTicketOnClient(
  client: PoolClient,
  entrada: { ticketId: string; staffId: string; body: string },
): Promise<SupportMessageRow> {
  const { rows } = await client.query<{
    id: string; ticket_id: string; author_kind: "host" | "operator";
    author_account_id: string | null; author_staff_id: string | null; body: string; created_at: Date;
  }>(
    `INSERT INTO support_messages (ticket_id, author_kind, author_staff_id, body)
     VALUES ($1, 'operator', $2, $3)
     RETURNING id, ticket_id, author_kind, author_account_id, author_staff_id, body, created_at`,
    [entrada.ticketId, entrada.staffId, entrada.body.slice(0, 4000)],
  );
  const m = rows[0]!;
  await client.query(
    `UPDATE support_tickets SET updated_at = now(), status = CASE WHEN status = 'open' THEN 'pending' ELSE status END
      WHERE id = $1`,
    [entrada.ticketId],
  );
  return {
    id: m.id, ticketId: m.ticket_id, authorKind: m.author_kind,
    authorAccountId: m.author_account_id, authorStaffId: m.author_staff_id, body: m.body, createdAt: m.created_at,
  };
}

export async function assignSupportTicketOnClient(
  client: PoolClient,
  entrada: { ticketId: string; staffId: string | null },
): Promise<void> {
  await client.query("UPDATE support_tickets SET assignee_staff_id = $2, updated_at = now() WHERE id = $1", [
    entrada.ticketId,
    entrada.staffId,
  ]);
}

export async function updateSupportTicketStatusOnClient(
  client: PoolClient,
  entrada: { ticketId: string; status: SupportStatus },
): Promise<void> {
  await client.query("UPDATE support_tickets SET status = $2, updated_at = now() WHERE id = $1", [
    entrada.ticketId,
    entrada.status,
  ]);
}

/** Muda a prioridade E recomputa o SLA a partir de AGORA — reclassificar um p2 pra p0 reabre a janela, não herda o prazo do p2. */
export async function updateSupportTicketPriorityOnClient(
  client: PoolClient,
  entrada: { ticketId: string; priority: SupportPriority },
): Promise<void> {
  await client.query("UPDATE support_tickets SET priority = $2, sla_due_at = $3, updated_at = now() WHERE id = $1", [
    entrada.ticketId,
    entrada.priority,
    slaDueAt(entrada.priority),
  ]);
}

export type SupportTicketQueueFilter = {
  statuses?: SupportStatus[];
  assigneeStaffId?: string;
  limit: number;
};

/**
 * Cross-conta por desenho — chamada sob `withPlatformAggregation`.
 * Ordenação FIXA por `sla_due_at ASC NULLS LAST` — é o que "queima", não a
 * criação nem a prioridade (spec §8.1.6). Prioridade e criação entram só
 * como desempate visual na UI, nunca como ORDER BY primário.
 */
export async function listSupportTicketsQueueAdmin(
  pool: Pool,
  filter: SupportTicketQueueFilter,
): Promise<{ rows: SupportTicketAdmin[] }> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.statuses?.length) {
    params.push(filter.statuses);
    clauses.push(`status = ANY($${params.length})`);
  }
  if (filter.assigneeStaffId) {
    params.push(filter.assigneeStaffId);
    clauses.push(`assignee_staff_id = $${params.length}`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    id: string; account_id: string; event_id: string | null; subject: string;
    status: SupportStatus; priority: SupportPriority; sla_due_at: Date | null;
    created_at: Date; assignee_staff_id: string | null;
  }>(
    `SELECT id, account_id, event_id, subject, status, priority, sla_due_at, created_at, assignee_staff_id
       FROM support_tickets
       ${where}
      ORDER BY sla_due_at ASC NULLS LAST, created_at ASC
      LIMIT $${params.length}`,
    params,
  );

  return {
    rows: rows.map((t) => ({
      id: t.id, accountId: t.account_id, eventId: t.event_id, subject: t.subject,
      status: t.status, priority: t.priority, slaDueAt: t.sla_due_at, createdAt: t.created_at,
      assigneeStaffId: t.assignee_staff_id,
    })),
  };
}
