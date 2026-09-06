import type { Pool, PoolClient } from "pg";

/**
 * Acesso a `curation_jobs` (fila por evento, migration 0065) e
 * `media_curation_scores` (um registro por mídia). Molde de
 * `moderation-queue.ts` (branch `feat/moderacao-real`): claim atômico com
 * `FOR UPDATE SKIP LOCKED` num único `UPDATE ... RETURNING`, nunca `Set` em
 * memória — não sobrevive a mais de uma instância. Toda função aqui recebe
 * `client` já dentro de uma transação escopada por `comEvento` (RLS ativa via
 * `SET LOCAL app.event_id`), exceto `listEventsWithPendingCuration`, que
 * cruza eventos de propósito e por isso roda no pool `BYPASSRLS`
 * (`albora_agregador`, só leitura — esse papel não tem UPDATE em
 * `curation_jobs`, então o claim em si sempre roda escopado por evento).
 *
 * Score `NULL` em `media_curation_scores` é sinal AUSENTE, nunca sinal ruim —
 * a mídia continua no editor do livro como qualquer outra.
 */

const TETO_UPLOADS_PENDENTES = 100;

export type JobDeCuration = {
  id: string;
  eventId: string;
  attempts: number;
};

/** `ON CONFLICT (event_id) DO NOTHING` — reenfileirar um evento que já tem job (pending, processing, done ou failed) não tem efeito. Reprocessar um evento já concluído é decisão de outra camada (ex.: reabrir o editor), fora do escopo desta função. */
export async function enqueueCuration(client: PoolClient, eventId: string): Promise<void> {
  await client.query(
    `INSERT INTO curation_jobs (event_id)
     VALUES ($1)
     ON CONFLICT (event_id) DO NOTHING`,
    [eventId],
  );
}

/**
 * `UNIQUE (event_id)` garante no máximo uma linha por evento, mas não evita
 * dois workers reivindicando essa mesma linha ao mesmo tempo — por isso o
 * `FOR UPDATE SKIP LOCKED` na subquery, não `UNIQUE` sozinho. Devolve um
 * array (0 ou 1 item) para manter a mesma forma de `claimNextForModeration`.
 */
export async function claimCurationJobs(
  client: PoolClient,
  eventId: string,
): Promise<JobDeCuration[]> {
  const { rows } = await client.query<{ id: string; event_id: string; attempts: number }>(
    `UPDATE curation_jobs
        SET status = 'processing', claimed_at = now(), attempts = attempts + 1
      WHERE id = (
        SELECT id FROM curation_jobs
         WHERE event_id = $1 AND status = 'pending'
         ORDER BY created_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, event_id, attempts`,
    [eventId],
  );

  return rows.map((r) => ({ id: r.id, eventId: r.event_id, attempts: r.attempts }));
}

/** Só age sobre linha ainda `processing` — impede que um worker zumbi (destravado depois de outro já ter concluído) reescreva um resultado já gravado. */
export async function completeCurationJob(client: PoolClient, jobId: string): Promise<void> {
  await client.query(
    `UPDATE curation_jobs
        SET status = 'done', completed_at = now()
      WHERE id = $1 AND status = 'processing'`,
    [jobId],
  );
}

/**
 * Abaixo do teto volta a `pending` (próximo claim tenta de novo); no teto
 * marca `failed`. `attempts` já foi incrementado no claim — não incrementar
 * aqui de novo, ou o ciclo real claim→fail valeria 2 por tentativa.
 * `AND status = 'processing'` pela mesma razão de `completeCurationJob`.
 */
export async function failCurationJob(
  client: PoolClient,
  jobId: string,
  maxAttempts: number,
  error?: string,
): Promise<"retry" | "failed"> {
  const { rows } = await client.query<{ status: string }>(
    `UPDATE curation_jobs
        SET status = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'pending' END,
            last_error = $3
      WHERE id = $1 AND status = 'processing'
      RETURNING status`,
    [jobId, maxAttempts, error ?? null],
  );

  return rows[0]?.status === "failed" ? "failed" : "retry";
}

/**
 * Devolve para `pending` o claim órfão de processo morto (instância
 * serverless reciclando, deploy, OOM entre reivindicar e concluir).
 * `attempts` NÃO é decrementado: a tentativa perdida foi real, e preservá-la
 * é o que impede um item envenenado de ser reivindicado em laço infinito.
 */
export async function reclaimStaleCurationJob(
  client: PoolClient,
  eventId: string,
  staleAfterSeconds: number,
): Promise<number> {
  const { rowCount } = await client.query(
    `UPDATE curation_jobs
        SET status = 'pending'
      WHERE event_id = $1
        AND status = 'processing'
        AND claimed_at < now() - make_interval(secs => $2)`,
    [eventId, staleAfterSeconds],
  );
  return rowCount ?? 0;
}

/**
 * Gatilho de enfileiramento (spec §4, opção b): nenhum chamador decidia quando enfileirar um
 * evento, então `curation_jobs` nunca recebia uma linha em produção (achado 1 do review). O sinal
 * de "evento encerrado" é `events.ends_at <= now()` — já existe na tabela, não precisa de coluna
 * nova. Cross-event por desenho, mesmo molde de `listEventsWithPendingCuration`: roda no pool
 * `BYPASSRLS`, só leitura (o enfileiramento em si é escopado por evento, via `enqueueCuration` sob
 * `comEvento`/`withEvent`, chamado pelo handler). `LEFT JOIN ... IS NULL` exclui evento que já tem
 * qualquer linha em `curation_jobs` (pending, processing, done ou failed) — `enqueueCuration` é
 * `ON CONFLICT DO NOTHING`, então chamar esta função a cada varredura do cron nunca duplica.
 */
export async function listEventsNeedingCurationEnqueue(pool: Pool, limit = 50): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT e.id
       FROM events e
       LEFT JOIN curation_jobs cj ON cj.event_id = e.id
      WHERE e.ends_at <= now() AND cj.event_id IS NULL
      LIMIT $1`,
    [limit],
  );
  return rows.map((r) => r.id);
}

/** Cross-event por desenho (varredura do job periódico) — roda no pool `BYPASSRLS`, só leitura. Inclui eventos com claim preso além do prazo, senão o job periódico nunca os visitaria de novo para reivindicar. */
export async function listEventsWithPendingCuration(
  pool: Pool,
  limit = 100,
  staleAfterSeconds = 600,
): Promise<string[]> {
  const { rows } = await pool.query<{ event_id: string }>(
    `SELECT DISTINCT event_id FROM curation_jobs
      WHERE status = 'pending'
         OR (status = 'processing' AND claimed_at < now() - make_interval(secs => $2))
      LIMIT $1`,
    [limit, staleAfterSeconds],
  );
  return rows.map((r) => r.event_id);
}

export type UploadAguardandoScore = {
  uploadId: string;
  chaveFull: string;
};

/**
 * Mídia publicada do evento que ainda não tem linha em
 * `media_curation_scores` — inclui a que já foi tentada e degradou para
 * score ausente (essa já tem linha, com todos os campos `NULL`, então não
 * volta aqui; sem isso o job reprocessaria a mesma falha para sempre).
 * `event_id` no WHERE redundante sob RLS — duas camadas para a mesma
 * invariante (padrão de `classificador-db.ts`).
 */
export async function listUploadsAwaitingCurationScore(
  client: PoolClient,
  eventId: string,
  limit: number,
): Promise<UploadAguardandoScore[]> {
  const teto = Math.min(Math.max(Math.trunc(limit), 1), TETO_UPLOADS_PENDENTES);

  const { rows } = await client.query<{ id: string; storage_key: string }>(
    `SELECT u.id, u.storage_key
       FROM uploads u
       LEFT JOIN media_curation_scores s ON s.upload_id = u.id
      WHERE u.event_id = $1 AND u.state = 'published' AND s.upload_id IS NULL
      ORDER BY u.created_at ASC, u.id ASC
      LIMIT $2`,
    [eventId, teto],
  );

  return rows.map((r) => ({ uploadId: r.id, chaveFull: r.storage_key }));
}

export type EntradaDeScore = {
  uploadId: string;
  eventId: string;
  perceptualHash: string | null;
  sharpness: number | null;
  exposure: number | null;
};

/** Upsert por `upload_id` (PK) — `NULL` em qualquer campo é aceito de propósito: sinal ausente, nunca sinal ruim. */
export async function saveCurationScores(client: PoolClient, entry: EntradaDeScore): Promise<void> {
  await client.query(
    `INSERT INTO media_curation_scores (upload_id, event_id, perceptual_hash, sharpness, exposure, computed_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (upload_id) DO UPDATE SET
       perceptual_hash = EXCLUDED.perceptual_hash,
       sharpness = EXCLUDED.sharpness,
       exposure = EXCLUDED.exposure,
       computed_at = now()`,
    [entry.uploadId, entry.eventId, entry.perceptualHash, entry.sharpness, entry.exposure],
  );
}

export type LinhaDeScore = {
  uploadId: string;
  hash: string | null;
  sharpness: number | null;
  exposure: number | null;
};

/** Forma compatível com `MediaScores` de `@albora/curation` (`rankForBook`), sem importar o pacote aqui — `packages/db` não depende de `packages/curation`. */
export async function listCurationScores(client: PoolClient, eventId: string): Promise<LinhaDeScore[]> {
  const { rows } = await client.query<{
    upload_id: string;
    perceptual_hash: string | null;
    sharpness: number | null;
    exposure: number | null;
  }>(
    `SELECT upload_id, perceptual_hash, sharpness, exposure
       FROM media_curation_scores
      WHERE event_id = $1`,
    [eventId],
  );

  return rows.map((r) => ({
    uploadId: r.upload_id,
    hash: r.perceptual_hash,
    sharpness: r.sharpness,
    exposure: r.exposure,
  }));
}
