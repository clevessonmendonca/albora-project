import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export type DsarKind = "access" | "portability" | "rectification" | "deletion";
export type DsarStatus = "open" | "in_progress" | "completed" | "refused";

export type DsarRequestRow = {
  id: string;
  kind: DsarKind;
  subjectAccountId: string;
  receivedAt: Date;
  legalDueAt: Date;
  status: DsarStatus;
  assigneeStaffId: string | null;
  evidenceUrl: string | null;
  completedAt: Date | null;
  notes: string | null;
};

type DsarDbRow = {
  id: string;
  kind: DsarKind;
  subject_account_id: string;
  received_at: Date;
  legal_due_at: Date;
  status: DsarStatus;
  assignee_staff_id: string | null;
  evidence_url: string | null;
  completed_at: Date | null;
  notes: string | null;
};

function toRow(r: DsarDbRow): DsarRequestRow {
  return {
    id: r.id,
    kind: r.kind,
    subjectAccountId: r.subject_account_id,
    receivedAt: r.received_at,
    legalDueAt: r.legal_due_at,
    status: r.status,
    assigneeStaffId: r.assignee_staff_id,
    evidenceUrl: r.evidence_url,
    completedAt: r.completed_at,
    notes: r.notes,
  };
}

const SELECT = `SELECT id, kind, subject_account_id, received_at, legal_due_at, status, assignee_staff_id, evidence_url, completed_at, notes FROM dsar_requests`;

/**
 * `dsar_requests` (migration 0062) não tem RLS — é tabela de plataforma,
 * como `staff_users`/`audit_log` (mesma razão), não "cross-tenant" no
 * sentido do ADR de isolamento por evento. Por isso as funções aqui usam
 * o pool comum direto, sem `withPlatformAggregation`.
 *
 * Roda dentro da tx de `executeCommand`. `legal_due_at` é `NOT NULL` sem
 * DEFAULT na migration — nenhuma fonte no produto define quantos dias cada
 * tipo de pedido tem, então quem registra informa o prazo explicitamente;
 * inventar uma regra aqui fabricaria uma obrigação legal a partir de nada.
 */
export async function createDsarRequestOnClient(
  client: PoolClient,
  entrada: { id?: string; kind: DsarKind; subjectAccountId: string; legalDueAt: Date },
): Promise<DsarRequestRow> {
  // `id` gerado aqui (não pelo DEFAULT da coluna) quando o chamador não traz
  // um — `createDsarRequest` (packages/application) o gera antes de abrir a
  // transação, pra poder auditar `target_id` com o id real do pedido criado
  // (RULING: "audite o id do pedido"), não `null`.
  const id = entrada.id ?? randomUUID();
  const { rows } = await client.query<DsarDbRow>(
    `INSERT INTO dsar_requests (id, kind, subject_account_id, legal_due_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, kind, subject_account_id, received_at, legal_due_at, status, assignee_staff_id, evidence_url, completed_at, notes`,
    [id, entrada.kind, entrada.subjectAccountId, entrada.legalDueAt],
  );
  return toRow(rows[0]!);
}

/** Roda dentro da tx de `executeCommand` — mesmo comando cobre atribuir, mudar status, anexar comprovante e concluir; `completed_at` segue `status` automaticamente. */
export async function updateDsarRequestOnClient(
  client: PoolClient,
  entrada: {
    id: string;
    status?: DsarStatus;
    assigneeStaffId?: string | null;
    evidenceUrl?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  await client.query(
    `UPDATE dsar_requests SET
       status = COALESCE($2, status),
       assignee_staff_id = CASE WHEN $3::boolean THEN $4::uuid ELSE assignee_staff_id END,
       evidence_url = CASE WHEN $5::boolean THEN $6 ELSE evidence_url END,
       notes = CASE WHEN $7::boolean THEN $8 ELSE notes END,
       completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
     WHERE id = $1`,
    [
      entrada.id,
      entrada.status ?? null,
      entrada.assigneeStaffId !== undefined,
      entrada.assigneeStaffId ?? null,
      entrada.evidenceUrl !== undefined,
      entrada.evidenceUrl ?? null,
      entrada.notes !== undefined,
      entrada.notes ?? null,
    ],
  );
}

export type ListDsarRequestsFilter = { statuses?: DsarStatus[]; limit: number };

/** Ordena por prazo legal mais próximo primeiro — mesma lógica da fila de suporte (`listSupportTicketQueueAdmin`, ordenada por SLA): o que queima primeiro fica no topo. */
export async function listDsarRequestsAdmin(pool: Pool, filter: ListDsarRequestsFilter): Promise<{ rows: DsarRequestRow[] }> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.statuses?.length) {
    params.push(filter.statuses);
    clauses.push(`status = ANY($${params.length})`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query<DsarDbRow>(
    `${SELECT} ${where} ORDER BY legal_due_at ASC, received_at ASC LIMIT $${params.length}`,
    params,
  );
  return { rows: rows.map(toRow) };
}

export async function getDsarRequestAdmin(pool: Pool, id: string): Promise<DsarRequestRow | null> {
  const { rows } = await pool.query<DsarDbRow>(`${SELECT} WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? toRow(row) : null;
}

/**
 * Roda dentro da tx de `executeCommand`, com `FOR UPDATE`: quem lê aqui é
 * `deleteAccountOnRequest` decidindo se pode purgar — o lock impede que dois
 * operadores executem o mesmo pedido de exclusão em paralelo e ambos vejam
 * `status = 'open'`.
 */
export async function getDsarRequestOnClient(client: PoolClient, id: string): Promise<DsarRequestRow | null> {
  const { rows } = await client.query<DsarDbRow>(`${SELECT} WHERE id = $1 FOR UPDATE`, [id]);
  const row = rows[0];
  return row ? toRow(row) : null;
}
