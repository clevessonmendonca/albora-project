import type { Pool, PoolClient } from "pg";

/**
 * Fila de moderação sobre `photo_moderation` (migration 0062). Substitui o
 * `Set` em memória de classify.ts, que não sobrevive a mais de uma instância:
 * N workers classificavam o mesmo lote e o custo do provedor era pago N
 * vezes. `claimNextForModeration` é a defesa contra isso — um único UPDATE
 * com `FOR UPDATE SKIP LOCKED`, não um `UNIQUE` sozinho, porque a constraint
 * evita linha duplicada mas não evita dois workers reivindicando o mesmo
 * item pendente ao mesmo tempo.
 *
 * Toda função aqui recebe `client` já dentro de uma transação escopada por
 * `comEvento` (RLS ativa via `SET LOCAL app.event_id`) — nenhuma abre a
 * própria transação. Nenhuma loga PII, nem grava imagem ou PII em `result`.
 */

const MAX_CLAIM = 50;

export type ClaimedItem = { uploadId: string; eventId: string; attempts: number };

/** `ON CONFLICT DO NOTHING` na PK (`upload_id`) — chamar duas vezes para o mesmo upload é idempotente, não estoura. */
export async function enqueueModeration(
  client: PoolClient,
  entry: { uploadId: string; eventId: string },
): Promise<void> {
  await client.query(
    `INSERT INTO photo_moderation (upload_id, event_id)
     VALUES ($1, $2)
     ON CONFLICT (upload_id) DO NOTHING`,
    [entry.uploadId, entry.eventId],
  );
}

/**
 * Um único statement: a subquery com `FOR UPDATE SKIP LOCKED` seleciona e
 * trava as linhas pendentes, o `UPDATE` externo já as marca `claimed` na
 * mesma volta ao banco. É isso que faz dois workers concorrentes pegarem
 * itens diferentes em vez de brigar pelo mesmo — um pula o que o outro já
 * travou, não espera.
 */
export async function claimNextForModeration(
  client: PoolClient,
  eventId: string,
  limit: number,
): Promise<ClaimedItem[]> {
  const cap = Math.min(Math.max(Math.trunc(limit), 1), MAX_CLAIM);

  const { rows } = await client.query<{ upload_id: string; event_id: string; attempts: number }>(
    `UPDATE photo_moderation
        SET status = 'claimed', claimed_at = now(), attempts = attempts + 1
      WHERE upload_id IN (
        SELECT upload_id FROM photo_moderation
         WHERE event_id = $1 AND status = 'pending'
         ORDER BY created_at
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      )
      RETURNING upload_id, event_id, attempts`,
    [eventId, cap],
  );

  return rows.map((r) => ({ uploadId: r.upload_id, eventId: r.event_id, attempts: r.attempts }));
}

/** Categorias e escores do provedor, nunca a imagem — `result` é `jsonb`, serializado explicitamente (node-postgres não converte objeto JS sozinho). */
export async function completeModeration(
  client: PoolClient,
  uploadId: string,
  outcome: { provider: string; result: unknown },
): Promise<void> {
  await client.query(
    `UPDATE photo_moderation
        SET status = 'done', provider = $2, result = $3, completed_at = now()
      WHERE upload_id = $1`,
    [uploadId, outcome.provider, JSON.stringify(outcome.result ?? {})],
  );
}

/**
 * Decide, sem incrementar: uma tentativa **é um claim**, e quem conta é
 * `claimNextForModeration`. Incrementar aqui também faria cada ciclo real
 * `claim → fail` valer 2, e com `maxAttempts = 3` a mídia seria abandonada
 * depois de 2 tentativas.
 *
 * Abaixo do teto volta pra `pending` (o próximo claim pega de novo); no teto
 * marca `failed` e para de tentar. Um statement só — ler e depois escrever
 * separado abriria corrida entre dois workers falhando o mesmo item.
 */
export async function failModeration(
  client: PoolClient,
  uploadId: string,
  maxAttempts: number,
): Promise<"retry" | "failed"> {
  const { rows } = await client.query<{ status: string }>(
    `UPDATE photo_moderation
        SET status = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'pending' END
      WHERE upload_id = $1
      RETURNING status`,
    [uploadId, maxAttempts],
  );

  return rows[0]?.status === "failed" ? "failed" : "retry";
}

/**
 * Rede de segurança da Task 6: quais eventos têm mídia `pending` na fila,
 * independente do telão ter sido aberto — é a pergunta que o job periódico
 * faz antes de drenar evento por evento. Cruza eventos de propósito, então
 * roda no pool do papel `BYPASSRLS` (mesma família de `listDueRetentionJobs`
 * em `retention-jobs.ts`), nunca no pool com RLS de aplicação. `failed` fica
 * de fora: `claimNextForModeration` só pega `pending`, reincluir `failed`
 * aqui não geraria nenhum reprocessamento, só ruído na varredura.
 */
export async function listEventsWithPendingModeration(
  pool: Pool,
  limit = 100,
): Promise<string[]> {
  const { rows } = await pool.query<{ event_id: string }>(
    `SELECT DISTINCT event_id FROM photo_moderation WHERE status = 'pending' LIMIT $1`,
    [limit],
  );
  return rows.map((r) => r.event_id);
}
