import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

/** TTL fixo do subsistema (spec §11) — conta a partir da APROVAÇÃO, não da criação do pedido. */
export const IMPERSONATION_TTL_MINUTES = 30;

export type ImpersonationStatus = "pending" | "approved" | "active" | "ended" | "denied" | "expired";

export type ImpersonationRequestRow = {
  id: string;
  requesterStaffId: string;
  approverStaffId: string | null;
  targetAccountId: string;
  reason: string;
  status: ImpersonationStatus;
  createdAt: Date;
  approvedAt: Date | null;
  startedAt: Date | null;
  expiresAt: Date | null;
  endedAt: Date | null;
};

type ImpersonationDbRow = {
  id: string;
  requester_staff_id: string;
  approver_staff_id: string | null;
  target_account_id: string;
  reason: string;
  status: ImpersonationStatus;
  created_at: Date;
  approved_at: Date | null;
  started_at: Date | null;
  expires_at: Date | null;
  ended_at: Date | null;
};

function toRow(r: ImpersonationDbRow): ImpersonationRequestRow {
  return {
    id: r.id,
    requesterStaffId: r.requester_staff_id,
    approverStaffId: r.approver_staff_id,
    targetAccountId: r.target_account_id,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    approvedAt: r.approved_at,
    startedAt: r.started_at,
    expiresAt: r.expires_at,
    endedAt: r.ended_at,
  };
}

const SELECT = `SELECT id, requester_staff_id, approver_staff_id, target_account_id, reason, status,
       created_at, approved_at, started_at, expires_at, ended_at
  FROM impersonation_requests`;

/** `id` gerado aqui quando o chamador não traz um — `requestImpersonation` (application) o gera antes de abrir a transação, pra poder auditar `target_id` com o id real do pedido criado, não `null` (mesmo padrão de `createDsarRequestOnClient`). */
export async function createImpersonationRequestOnClient(
  client: PoolClient,
  entrada: { id?: string; requesterStaffId: string; targetAccountId: string; reason: string },
): Promise<ImpersonationRequestRow> {
  const id = entrada.id ?? randomUUID();
  const { rows } = await client.query<ImpersonationDbRow>(
    `INSERT INTO impersonation_requests (id, requester_staff_id, target_account_id, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status,
               created_at, approved_at, started_at, expires_at, ended_at`,
    [id, entrada.requesterStaffId, entrada.targetAccountId, entrada.reason],
  );
  return toRow(rows[0]!);
}

/**
 * `pending -> approved`. Só grava `approver_staff_id`, `approved_at` e
 * `expires_at` (o TTL nasce aqui, não na criação — decisão consciente da
 * T1). NÃO ativa a sessão: ativar é `startImpersonationRequestOnClient`,
 * separado, porque quem aprova e quem efetivamente entra na conta podem
 * ser momentos distintos no tempo.
 *
 * Uso único do próprio ato de aprovar: o `WHERE status = 'pending'` faz
 * uma segunda aprovação (pedido já `approved`/`denied`/etc.) afetar zero
 * linhas — vira erro explícito abaixo, nunca sucesso mudo.
 */
export async function approveImpersonationRequestOnClient(
  client: PoolClient,
  entrada: { id: string; approverStaffId: string; ttlMinutes: number },
): Promise<ImpersonationRequestRow> {
  const { rows } = await client.query<ImpersonationDbRow>(
    `UPDATE impersonation_requests
        SET status = 'approved', approver_staff_id = $2, approved_at = now(),
            expires_at = now() + make_interval(mins => $3)
      WHERE id = $1 AND status = 'pending'
      RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status,
                created_at, approved_at, started_at, expires_at, ended_at`,
    [entrada.id, entrada.approverStaffId, entrada.ttlMinutes],
  );
  const row = rows[0];
  if (!row) {
    throw new Error(
      `pedido de impersonação ${entrada.id} não está pending (já aprovado, negado, iniciado ou inexistente)`,
    );
  }
  return toRow(row);
}

export async function denyImpersonationRequestOnClient(
  client: PoolClient,
  entrada: { id: string; approverStaffId: string },
): Promise<ImpersonationRequestRow> {
  const { rows } = await client.query<ImpersonationDbRow>(
    `UPDATE impersonation_requests SET status = 'denied', approver_staff_id = $2
      WHERE id = $1 AND status = 'pending'
      RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status,
                created_at, approved_at, started_at, expires_at, ended_at`,
    [entrada.id, entrada.approverStaffId],
  );
  const row = rows[0];
  if (!row) throw new Error(`pedido de impersonação ${entrada.id} não está pending`);
  return toRow(row);
}

/**
 * `approved -> active`. Uso único E checagem de TTL na MESMA query — a
 * mesma `UPDATE ... WHERE status = 'approved' AND expires_at > now()`
 * resolve as duas invariantes: uma segunda chamada já encontra
 * `status = 'active'` (zero linhas), e uma chamada tardia já encontra
 * `expires_at <= now()` (zero linhas também). Não depende de job de
 * limpeza pra marcar `expired` — o "não expirado" é reavaliado contra
 * `now()` a cada tentativa de início, não contra um status pré-calculado.
 */
export async function startImpersonationRequestOnClient(
  client: PoolClient,
  entrada: { id: string },
): Promise<ImpersonationRequestRow> {
  const { rows } = await client.query<ImpersonationDbRow>(
    `UPDATE impersonation_requests
        SET status = 'active', started_at = now()
      WHERE id = $1 AND status = 'approved' AND expires_at > now()
      RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status,
                created_at, approved_at, started_at, expires_at, ended_at`,
    [entrada.id],
  );
  const row = rows[0];
  if (row) return toRow(row);

  const atual = await getImpersonationRequestById(client, entrada.id);
  if (!atual) throw new Error(`pedido de impersonação ${entrada.id} não encontrado`);
  if (atual.status === "active") throw new Error(`pedido de impersonação ${entrada.id} já foi iniciado — uso único`);
  if (atual.status !== "approved") {
    throw new Error(`pedido de impersonação ${entrada.id} não está approved (atual: ${atual.status})`);
  }
  throw new Error(`pedido de impersonação ${entrada.id} expirou`);
}

/** Encerramento explícito (spec §11) — revoga a sessão de host marcada NA MESMA transação, pra nunca deixar uma janela aberta depois que o operador terminou. */
export async function endImpersonationRequestOnClient(
  client: PoolClient,
  entrada: { id: string },
): Promise<ImpersonationRequestRow> {
  const { rows } = await client.query<ImpersonationDbRow>(
    `UPDATE impersonation_requests SET status = 'ended', ended_at = now()
      WHERE id = $1 AND status = 'active'
      RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status,
                created_at, approved_at, started_at, expires_at, ended_at`,
    [entrada.id],
  );
  const row = rows[0];
  if (!row) throw new Error(`pedido de impersonação ${entrada.id} não está active`);
  await client.query(
    "UPDATE host_sessions SET revoked_at = now() WHERE impersonation_id = $1 AND revoked_at IS NULL",
    [entrada.id],
  );
  return toRow(row);
}

export async function getImpersonationRequestById(db: Queryable, id: string): Promise<ImpersonationRequestRow | null> {
  const { rows } = await db.query<ImpersonationDbRow>(`${SELECT} WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? toRow(row) : null;
}

/** Para o banner de T10: existe, para ESTE staff, uma janela ativa agora? */
export async function getActiveImpersonationForStaff(pool: Pool, staffUserId: string): Promise<ImpersonationRequestRow | null> {
  const { rows } = await pool.query<ImpersonationDbRow>(
    `${SELECT} WHERE requester_staff_id = $1 AND status = 'active' AND expires_at > now() ORDER BY started_at DESC LIMIT 1`,
    [staffUserId],
  );
  const row = rows[0];
  return row ? toRow(row) : null;
}

export async function listPendingImpersonationRequestsAdmin(pool: Pool): Promise<ImpersonationRequestRow[]> {
  const { rows } = await pool.query<ImpersonationDbRow>(`${SELECT} WHERE status = 'pending' ORDER BY created_at ASC`);
  return rows.map(toRow);
}
