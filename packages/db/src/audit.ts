import type { Pool, PoolClient } from "pg";
import { logger } from "@albora/core";

export type AuditActorKind = "staff" | "system" | "host";
export type AuditTargetKind = "account" | "event" | "ticket" | "subscription" | "staff_user" | "platform";

export type AuditEntry = {
  actorKind: AuditActorKind;
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  targetKind: AuditTargetKind;
  targetId?: string | null;
  reason: string;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  ipHash?: string | null;
};

export type AuditRow = {
  id: string;
  at: Date;
  actorKind: AuditActorKind;
  actorId: string | null;
  actorLabel: string | null;
  action: string;
  targetKind: AuditTargetKind;
  targetId: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  requestId: string | null;
  ipHash: string | null;
};

export type SecurityEventKind =
  | "login.failed" | "magic_link.abuse" | "capability.denied"
  | "rate_limit.exceeded" | "session.reuse" | "reauth.failed";

export type SecurityEvent = {
  kind: SecurityEventKind;
  actorKind?: string | null;
  actorId?: string | null;
  ipHash?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
};

export type SecurityEventRow = {
  id: string;
  at: Date;
  kind: SecurityEventKind;
  actorKind: string | null;
  actorId: string | null;
  ipHash: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
};

type Cursor = { at: string; id: string };

function encodeCursor(at: Date, id: string): string {
  return Buffer.from(JSON.stringify({ at: at.toISOString(), id } satisfies Cursor)).toString("base64url");
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
}

/** Recebe PoolClient de propósito — é o que permite a auditoria participar da transação do comando (ADR 0016 §2). */
export async function insertAuditLog(client: PoolClient, entry: AuditEntry): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO audit_log
       (actor_kind, actor_id, actor_label, action, target_kind, target_id, reason, metadata, request_id, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
     RETURNING id`,
    [
      entry.actorKind,
      entry.actorId ?? null,
      entry.actorLabel ?? null,
      entry.action,
      entry.targetKind,
      entry.targetId ?? null,
      entry.reason,
      JSON.stringify(entry.metadata ?? {}),
      entry.requestId ?? null,
      entry.ipHash ?? null,
    ],
  );
  return rows[0]!.id;
}

export type AuditLogFilter = {
  actorId?: string;
  targetKind?: AuditTargetKind;
  targetId?: string;
  action?: string;
  since?: Date;
  limit: number;
  cursor?: string;
};

type AuditDbRow = {
  id: string; at: Date; actor_kind: AuditActorKind; actor_id: string | null;
  actor_label: string | null; action: string; target_kind: AuditTargetKind;
  target_id: string | null; reason: string; metadata: Record<string, unknown>;
  request_id: string | null; ip_hash: string | null;
};

export async function listAuditLog(
  pool: Pool,
  filter: AuditLogFilter,
): Promise<{ rows: AuditRow[]; nextCursor: string | null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.actorId) { params.push(filter.actorId); clauses.push(`actor_id = $${params.length}`); }
  if (filter.targetKind) { params.push(filter.targetKind); clauses.push(`target_kind = $${params.length}`); }
  if (filter.targetId) { params.push(filter.targetId); clauses.push(`target_id = $${params.length}`); }
  if (filter.action) { params.push(filter.action); clauses.push(`action = $${params.length}`); }
  if (filter.since) { params.push(filter.since); clauses.push(`at >= $${params.length}`); }
  if (filter.cursor) {
    const c = decodeCursor(filter.cursor);
    params.push(c.at, c.id);
    clauses.push(`(at, id) < ($${params.length - 1}, $${params.length})`);
  }

  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<AuditDbRow>(
    `SELECT id, at, actor_kind, actor_id, actor_label, action, target_kind, target_id, reason, metadata, request_id, ip_hash
       FROM audit_log
       ${where}
      ORDER BY at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );

  const mapped: AuditRow[] = rows.map((r) => ({
    id: r.id, at: r.at, actorKind: r.actor_kind, actorId: r.actor_id, actorLabel: r.actor_label,
    action: r.action, targetKind: r.target_kind, targetId: r.target_id, reason: r.reason,
    metadata: r.metadata, requestId: r.request_id, ipHash: r.ip_hash,
  }));

  const last = mapped[mapped.length - 1];
  const nextCursor = mapped.length === filter.limit && last ? encodeCursor(last.at, last.id) : null;
  return { rows: mapped, nextCursor };
}

/** Caminho não-crítico: nunca derruba login (ou qualquer chamador) por falha de escrita de segurança. */
export async function insertSecurityEvent(pool: Pool, event: SecurityEvent): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO security_events (kind, actor_kind, actor_id, ip_hash, request_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        event.kind,
        event.actorKind ?? null,
        event.actorId ?? null,
        event.ipHash ?? null,
        event.requestId ?? null,
        JSON.stringify(event.metadata ?? {}),
      ],
    );
  } catch (erro) {
    logger.error("security_events.insercao_falhou", erro, { kind: event.kind });
  }
}

export type SecurityEventFilter = {
  kind?: SecurityEventKind;
  actorId?: string;
  since?: Date;
  limit: number;
  cursor?: string;
};

type SecurityEventDbRow = {
  id: string; at: Date; kind: SecurityEventKind; actor_kind: string | null;
  actor_id: string | null; ip_hash: string | null; request_id: string | null;
  metadata: Record<string, unknown>;
};

export async function listSecurityEvents(
  pool: Pool,
  filter: SecurityEventFilter,
): Promise<{ rows: SecurityEventRow[]; nextCursor: string | null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.kind) { params.push(filter.kind); clauses.push(`kind = $${params.length}`); }
  if (filter.actorId) { params.push(filter.actorId); clauses.push(`actor_id = $${params.length}`); }
  if (filter.since) { params.push(filter.since); clauses.push(`at >= $${params.length}`); }
  if (filter.cursor) {
    const c = decodeCursor(filter.cursor);
    params.push(c.at, c.id);
    clauses.push(`(at, id) < ($${params.length - 1}, $${params.length})`);
  }

  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<SecurityEventDbRow>(
    `SELECT id, at, kind, actor_kind, actor_id, ip_hash, request_id, metadata
       FROM security_events
       ${where}
      ORDER BY at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );

  const mapped: SecurityEventRow[] = rows.map((r) => ({
    id: r.id, at: r.at, kind: r.kind, actorKind: r.actor_kind, actorId: r.actor_id,
    ipHash: r.ip_hash, requestId: r.request_id, metadata: r.metadata,
  }));

  const last = mapped[mapped.length - 1];
  const nextCursor = mapped.length === filter.limit && last ? encodeCursor(last.at, last.id) : null;
  return { rows: mapped, nextCursor };
}
