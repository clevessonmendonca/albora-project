import type { Pool, PoolClient } from "pg";

/**
 * Fila durável para o purge de bytes no R2 pós-commit da exclusão de conta
 * (migration 0066). `purgeAccountDataOnClient` (retention-jobs.ts) já coleta
 * `keysToDelete` DENTRO da mesma transação que apaga a conta — este arquivo
 * só grava essas keys, nunca as recalcula, e nunca toca `retention-jobs.ts`.
 *
 * Sem `account_id` com FK e sem RLS: a conta é apagada na mesma transação
 * que enfileira, então a linha tem que sobreviver a ela — mesmo desenho de
 * `audit_log`. `storage_key` é caminho (`events/{event_id}/...`), nunca
 * credencial; por isso só as keys do R2 entram aqui, nunca token do Drive.
 */

export type AccountPurgeJobRow = {
  id: string;
  accountId: string;
  storageKey: string;
  status: "pending" | "purged" | "failed";
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  purgedAt: Date | null;
};

export type AccountPurgeMarkResult = { ok: true } | { ok: false; error: string };

/**
 * INSERT em massa, uma linha `pending` por key. Recebe `client` (não `pool`)
 * porque precisa entrar na MESMA transação do comando de exclusão: se o
 * commit passar, as keys estão registradas; se o rollback disparar, elas
 * somem junto — a fila nunca aponta para uma conta que não foi excluída.
 * Devolve os ids na mesma ordem de `keys`, para o chamador pós-commit marcar
 * cada linha sem precisar re-consultar por `account_id`.
 */
export async function enqueueAccountPurge(client: PoolClient, accountId: string, keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];

  const values: string[] = [];
  const params: unknown[] = [];
  for (const key of keys) {
    params.push(accountId, key);
    values.push(`($${params.length - 1}, $${params.length})`);
  }

  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO account_purge_jobs (account_id, storage_key)
     VALUES ${values.join(", ")}
     RETURNING id`,
    params,
  );
  return rows.map((r) => r.id);
}

/** Marca uma linha `purged` (sucesso) ou `failed` (com `last_error`), sempre incrementando `attempts`. Chamado pós-commit, fora da transação de exclusão. */
export async function markAccountPurgeKey(pool: Pool, id: string, result: AccountPurgeMarkResult): Promise<void> {
  if (result.ok) {
    await pool.query(
      `UPDATE account_purge_jobs
          SET status = 'purged', purged_at = now(), attempts = attempts + 1
        WHERE id = $1`,
      [id],
    );
  } else {
    await pool.query(
      `UPDATE account_purge_jobs
          SET status = 'failed', last_error = $2, attempts = attempts + 1
        WHERE id = $1`,
      [id, result.error],
    );
  }
}

/** Pendentes e falhados — para ops ver os bytes órfãos que o pós-commit ainda não conseguiu apagar. Falhados primeiro, mesma convenção de `listRetentionJobsAdmin`. */
export async function listPendingAccountPurgeJobs(pool: Pool): Promise<AccountPurgeJobRow[]> {
  const { rows } = await pool.query<{
    id: string;
    account_id: string;
    storage_key: string;
    status: "pending" | "purged" | "failed";
    attempts: number;
    last_error: string | null;
    created_at: Date;
    purged_at: Date | null;
  }>(
    `SELECT id, account_id, storage_key, status, attempts, last_error, created_at, purged_at
       FROM account_purge_jobs
      WHERE status <> 'purged'
      ORDER BY (status = 'failed') DESC, created_at ASC`,
  );

  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    storageKey: r.storage_key,
    status: r.status,
    attempts: r.attempts,
    lastError: r.last_error,
    createdAt: r.created_at,
    purgedAt: r.purged_at,
  }));
}
