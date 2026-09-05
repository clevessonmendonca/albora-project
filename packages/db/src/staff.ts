import type { Pool, PoolClient } from "pg";
import type { StaffRole } from "@albora/core";

export type StaffUserStatus = "active" | "suspended";

export type StaffUserRow = {
  id: string;
  email: string;
  name: string;
  status: StaffUserStatus;
  createdAt: Date;
  lastSeenAt: Date | null;
};

export type ResolvedStaffSession = {
  staffUserId: string;
  reauthenticatedAt: Date | null;
  createdAt: Date;
};

type Queryable = Pool | PoolClient;

type StaffUserDbRow = {
  id: string; email: string; name: string; status: StaffUserStatus;
  created_at: Date; last_seen_at: Date | null;
};

function rowToStaffUser(row: StaffUserDbRow): StaffUserRow {
  return {
    id: row.id, email: row.email, name: row.name, status: row.status,
    createdAt: row.created_at, lastSeenAt: row.last_seen_at,
  };
}

const SELECT_STAFF_USER = "SELECT id, email, name, status, created_at, last_seen_at FROM staff_users";

export async function createStaffUser(
  db: Queryable,
  entrada: { email: string; name: string },
): Promise<StaffUserRow> {
  const { rows } = await db.query<StaffUserDbRow>(
    `INSERT INTO staff_users (email, name) VALUES ($1, $2)
     RETURNING id, email, name, status, created_at, last_seen_at`,
    [entrada.email.trim().toLowerCase(), entrada.name],
  );
  return rowToStaffUser(rows[0]!);
}

export async function findStaffByEmail(db: Queryable, email: string): Promise<StaffUserRow | null> {
  const { rows } = await db.query<StaffUserDbRow>(`${SELECT_STAFF_USER} WHERE email = $1`, [
    email.trim().toLowerCase(),
  ]);
  const row = rows[0];
  return row ? rowToStaffUser(row) : null;
}

export async function findStaffById(db: Queryable, id: string): Promise<StaffUserRow | null> {
  const { rows } = await db.query<StaffUserDbRow>(`${SELECT_STAFF_USER} WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? rowToStaffUser(row) : null;
}

export async function listStaffRoles(db: Queryable, staffUserId: string): Promise<StaffRole[]> {
  const { rows } = await db.query<{ role: StaffRole }>(
    "SELECT role FROM staff_role_assignments WHERE staff_user_id = $1 ORDER BY role",
    [staffUserId],
  );
  return rows.map((r) => r.role);
}

export async function assignStaffRole(db: Queryable, staffUserId: string, role: StaffRole): Promise<void> {
  await db.query(
    `INSERT INTO staff_role_assignments (staff_user_id, role) VALUES ($1, $2)
     ON CONFLICT (staff_user_id, role) DO NOTHING`,
    [staffUserId, role],
  );
}

export async function removeStaffRole(db: Queryable, staffUserId: string, role: StaffRole): Promise<void> {
  await db.query("DELETE FROM staff_role_assignments WHERE staff_user_id = $1 AND role = $2", [staffUserId, role]);
}

export async function createStaffMagicLink(
  db: Queryable,
  entrada: { staffUserId: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db.query(
    "INSERT INTO staff_magic_links (token_hash, staff_user_id, expires_at) VALUES ($1, $2, $3)",
    [entrada.tokenHash, entrada.staffUserId, entrada.expiresAt],
  );
}

/** Consome e marca usado em UM statement — dois cliques simultâneos no mesmo link não podem consumir ambos. */
export async function consumeStaffMagicLink(db: Queryable, tokenHash: string): Promise<string | null> {
  const { rows } = await db.query<{ staff_user_id: string }>(
    `UPDATE staff_magic_links SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING staff_user_id`,
    [tokenHash],
  );
  return rows[0]?.staff_user_id ?? null;
}

export async function createStaffSession(
  db: Queryable,
  entrada: { staffUserId: string; tokenHash: string; expiresAt: Date; rotatedFrom?: string },
): Promise<void> {
  await db.query(
    "INSERT INTO staff_sessions (token_hash, staff_user_id, expires_at, rotated_from) VALUES ($1, $2, $3, $4)",
    [entrada.tokenHash, entrada.staffUserId, entrada.expiresAt, entrada.rotatedFrom ?? null],
  );
}

/** Junta com staff_users exigindo status='active'; filtra expirada, revogada e ociosa além do TTL informado. */
export async function resolveStaffSession(
  db: Queryable,
  tokenHash: string,
  opts: { idleMaxSeconds: number; now?: Date },
): Promise<ResolvedStaffSession | null> {
  const now = opts.now ?? new Date();
  const { rows } = await db.query<{ staff_user_id: string; reauthenticated_at: Date | null; created_at: Date }>(
    `SELECT s.staff_user_id, s.reauthenticated_at, s.created_at
       FROM staff_sessions s JOIN staff_users u ON u.id = s.staff_user_id
      WHERE s.token_hash = $1
        AND u.status = 'active'
        AND s.expires_at > $2
        AND s.revoked_at IS NULL
        AND s.last_used_at > $2 - make_interval(secs => $3)`,
    [tokenHash, now, opts.idleMaxSeconds],
  );
  const row = rows[0];
  return row
    ? { staffUserId: row.staff_user_id, reauthenticatedAt: row.reauthenticated_at, createdAt: row.created_at }
    : null;
}

export async function touchStaffSession(db: Queryable, tokenHash: string): Promise<void> {
  await db.query("UPDATE staff_sessions SET last_used_at = now() WHERE token_hash = $1", [tokenHash]);
}

export async function revokeStaffSession(db: Queryable, tokenHash: string): Promise<void> {
  await db.query(
    "UPDATE staff_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
    [tokenHash],
  );
}

/**
 * Sobe/desce a cadeia por rotated_from via CTE recursiva (ambas as direções) e revoga tudo.
 * As duas direções (subir a ancestrais, descer a sucessores) ficam num único termo
 * recursivo com OR: Postgres exige exatamente um termo recursivo por CTE — dois
 * UNIONs encadeados fazem o parser tratar o primeiro como parte do termo não-recursivo
 * e rejeitar a referência a `cadeia` ali dentro.
 */
export async function revokeSessionChain(db: Queryable, tokenHash: string): Promise<number> {
  const { rows } = await db.query<{ token_hash: string }>(
    `WITH RECURSIVE cadeia AS (
       SELECT token_hash, rotated_from FROM staff_sessions WHERE token_hash = $1
       UNION
       SELECT s.token_hash, s.rotated_from
         FROM staff_sessions s
         JOIN cadeia c ON s.token_hash = c.rotated_from OR s.rotated_from = c.token_hash
     )
     UPDATE staff_sessions SET revoked_at = now()
      WHERE token_hash IN (SELECT token_hash FROM cadeia) AND revoked_at IS NULL
      RETURNING token_hash`,
    [tokenHash],
  );
  return rows.length;
}

export async function findSessionEvenIfRevoked(
  db: Queryable,
  tokenHash: string,
): Promise<{ revokedAt: Date | null } | null> {
  const { rows } = await db.query<{ revoked_at: Date | null }>(
    "SELECT revoked_at FROM staff_sessions WHERE token_hash = $1",
    [tokenHash],
  );
  const row = rows[0];
  return row ? { revokedAt: row.revoked_at } : null;
}

export async function markReauthenticated(db: Queryable, tokenHash: string): Promise<void> {
  await db.query("UPDATE staff_sessions SET reauthenticated_at = now() WHERE token_hash = $1", [tokenHash]);
}

export type ActiveStaffOption = { id: string; name: string; email: string };

/** Para o dropdown "Atribuir a" — só staff `active` aparece como opção. */
export async function listActiveStaffUsers(db: Queryable): Promise<ActiveStaffOption[]> {
  const { rows } = await db.query<{ id: string; name: string; email: string }>(
    "SELECT id, name, email FROM staff_users WHERE status = 'active' ORDER BY name",
  );
  return rows;
}
