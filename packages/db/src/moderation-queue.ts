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

/**
 * Categorias e escores do provedor, nunca a imagem — `result` é `jsonb`,
 * serializado explicitamente (node-postgres não converte objeto JS sozinho).
 *
 * `AND status = 'claimed'` é o que impede um worker zumbi (preso em
 * `readThumb`, reivindicado de novo por `reclaimStaleModeration` depois dos
 * 600s) de reescrever, quando finalmente destravar, uma linha que outro
 * worker já concluiu — sem isso o resultado do worker vivo seria sobrescrito
 * pelo atrasado, e a linha de fila oscilaria sem necessidade.
 */
export async function completeModeration(
  client: PoolClient,
  uploadId: string,
  outcome: { provider: string; result: unknown },
): Promise<void> {
  await client.query(
    `UPDATE photo_moderation
        SET status = 'done', provider = $2, result = $3, completed_at = now()
      WHERE upload_id = $1 AND status = 'claimed'`,
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
 *
 * `AND status = 'claimed'` no WHERE, mesma razão de `completeModeration`:
 * sem isso um worker zumbi que destrava depois do reclaim devolveria a
 * `pending` (ou marcaria `failed`) uma linha que um worker mais rápido já
 * tinha marcado `done` — o próximo claim classificaria de novo algo já
 * resolvido. Sem linha `claimed` casando, o `UPDATE` não afeta nada e a
 * chamada é tratada como "retry" (não há `failed` possível a reportar).
 */
export async function failModeration(
  client: PoolClient,
  uploadId: string,
  maxAttempts: number,
): Promise<"retry" | "failed"> {
  const { rows } = await client.query<{ status: string }>(
    `UPDATE photo_moderation
        SET status = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'pending' END
      WHERE upload_id = $1 AND status = 'claimed'
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
/**
 * Devolve para `pending` os itens presos em `claimed` além do prazo.
 *
 * O claim não tem dono nem heartbeat: se o processo morre entre reivindicar e
 * concluir — instância serverless reciclando no meio do lote, deploy, OOM — a
 * linha fica `claimed` para sempre, órfã de qualquer claim futuro. A direção
 * é segura (sem veredito, o telão fecha), mas é um buraco silencioso: aquele
 * lote nunca mais é classificado e ninguém fica sabendo.
 *
 * `attempts` NÃO é decrementado: a tentativa perdida foi consumida de
 * verdade, e preservá-la é o que impede um item envenenado de ser
 * reivindicado em laço infinito — ele esgota o teto e vira `failed`.
 */
export async function reclaimStaleModeration(
  client: PoolClient,
  eventId: string,
  staleAfterSeconds: number,
): Promise<number> {
  const { rowCount } = await client.query(
    `UPDATE photo_moderation
        SET status = 'pending'
      WHERE event_id = $1
        AND status = 'claimed'
        AND claimed_at < now() - make_interval(secs => $2)`,
    [eventId, staleAfterSeconds],
  );
  return rowCount ?? 0;
}

/** Inclui eventos cujos itens estão presos em `claimed`: sem isso o job periódico nunca visitaria o evento que precisa de `reclaimStaleModeration`. */
export async function listEventsWithPendingModeration(
  pool: Pool,
  limit = 100,
  staleAfterSeconds = 600,
): Promise<string[]> {
  const { rows } = await pool.query<{ event_id: string }>(
    `SELECT DISTINCT event_id FROM photo_moderation
      WHERE status = 'pending'
         OR (status = 'claimed' AND claimed_at < now() - make_interval(secs => $2))
      LIMIT $1`,
    [limit, staleAfterSeconds],
  );
  return rows.map((r) => r.event_id);
}
