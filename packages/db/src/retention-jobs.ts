import type { Pool, PoolClient } from "pg";
import {
  diasRestantesAteD365,
  mayDeleteAtD365,
  planRetention,
  podeProcessarAgora,
  type DriveTokenVault,
  type MelhorExportParaRetencao,
  type MotivoRecusaD365,
  type RetentionKind,
} from "@albora/core";
import { comEvento } from "./event";

/**
 * O runner de retenção (spec drive-export §6). Todo o estado sensível
 * (gate do D365, lock por evento, reenvio no máximo uma vez) mora aqui, em
 * `@albora/db`, porque depende de transação/RLS/lock — o texto do e-mail e a
 * decisão de alertar ops ficam do lado de quem chama (`deps.notify`), porque
 * isso é HTTP/copy, e este pacote não faz chamada de rede.
 */

const DIAS_REENVIO: Partial<Record<RetentionKind, number>> = {
  d330_drive: 7,
  d358_warn: 3,
};

/** Agenda os quatro jobs de retenção — idempotente (ON CONFLICT DO NOTHING). Roda dentro de uma transação já aberta (ex.: `criarEvento`). */
export async function agendarRetencaoNaTransacao(
  cliente: PoolClient,
  eventId: string,
  endsAt: Date,
): Promise<void> {
  for (const item of planRetention(endsAt)) {
    await cliente.query(
      `INSERT INTO retention_jobs (event_id, kind, due_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, kind) DO NOTHING`,
      [eventId, item.kind, item.dueAt],
    );
  }
}

/** Mesma coisa, abrindo a própria transação — para chamadores fora de `criarEvento`. */
export async function scheduleRetentionJobs(pool: Pool, eventId: string, endsAt: Date): Promise<void> {
  await comEvento(pool, eventId, (c) => agendarRetencaoNaTransacao(c, eventId, endsAt));
}

export type DueRetentionJob = {
  id: string;
  eventId: string;
  kind: RetentionKind;
  dueAt: Date;
  attempts: number;
  endsAt: Date;
};

/**
 * Lista jobs vencidos. Exige pool cross-event (BYPASSRLS ou superuser) — como
 * o runner de `analytics-snapshots.mjs` já documenta: sem isso, o JOIN em
 * `events` devolve zero linhas sob RLS comum, e o sintoma é "nada vence
 * nunca", não um erro.
 */
export async function listDueRetentionJobs(pool: Pool, limit = 50): Promise<DueRetentionJob[]> {
  const { rows } = await pool.query<{
    id: string;
    event_id: string;
    kind: RetentionKind;
    due_at: Date;
    attempts: number;
    ends_at: Date;
  }>(
    `SELECT r.id, r.event_id, r.kind, r.due_at, r.attempts, e.ends_at
       FROM retention_jobs r
       JOIN events e ON e.id = r.event_id
      WHERE r.status IN ('pending', 'failed') AND r.due_at <= now()
      ORDER BY r.due_at ASC
      LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    kind: r.kind,
    dueAt: r.due_at,
    attempts: r.attempts,
    endsAt: r.ends_at,
  }));
}

export async function markRetentionJob(
  pool: Pool,
  id: string,
  status: "done" | "skipped" | "failed" | "running",
  lastError?: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE retention_jobs
        SET status = $2,
            attempts = attempts + CASE WHEN $2 = 'running' THEN 0 ELSE 1 END,
            last_error = $3,
            completed_at = CASE WHEN $2 IN ('done', 'skipped') THEN now() ELSE completed_at END
      WHERE id = $1`,
    [id, status, lastError ?? null],
  );
}

export type NotificacaoRetencao =
  | { kind: "d330_drive"; eventId: string; email: string }
  | { kind: "d358_warn"; eventId: string; email: string; diasRestantes: number }
  | { kind: "d365_skip"; eventId: string; email: string; reason: MotivoRecusaD365; diasDeAtraso: number };

export type DepsProcessarRetencao = {
  /** Nunca deve derrubar o processamento — falha de e-mail é enriquecimento, não caminho crítico. */
  notify: (n: NotificacaoRetencao) => void | Promise<void>;
  /**
   * Presente só quando o runner sabe falar com o Drive — permite abrir o
   * refresh token ANTES do purge (ainda com `status='conectado'`) para o
   * chamador revogar no Google depois do commit (spec §1.6). Ausente = a
   * revogação no Google não acontece; `drive_connections` é marcada
   * `revogado` do mesmo jeito (a garantia de isolamento não depende disto).
   */
  vault?: DriveTokenVault;
  now?: Date;
};

export type ResultadoRetentionJob =
  | { status: "aguardando" }
  | { status: "done"; chavesParaApagar?: string[]; driveRefreshTokenParaRevogar?: string }
  | { status: "skipped"; reason: MotivoRecusaD365; diasDeAtraso: number }
  | { status: "failed"; error: string };

/**
 * Processa um job vencido, sob `pg_advisory_xact_lock` por evento (spec §6.3)
 * — duas invocações concorrentes do runner (cron + manual, por exemplo) nunca
 * processam o mesmo evento duas vezes na mesma janela.
 *
 * `d330_drive`/`d358_warn` reenviam no máximo uma vez (`attempts`), depois
 * ficam `done` para sempre — mesmo espírito de "sem spam" do §6.6.
 *
 * `d365_delete` fail-closed: `mayDeleteAtD365` decide. Quando recusa, o job
 * volta para `failed` (não `skipped`) DE PROPÓSITO — precisa continuar sendo
 * pego pelo próximo ciclo do runner (`listDueRetentionJobs` só lista
 * `pending`/`failed`) até haver export `pronto` e atual, nunca uma vez só.
 */
export async function processRetentionJob(
  pool: Pool,
  job: DueRetentionJob,
  deps: DepsProcessarRetencao,
): Promise<ResultadoRetentionJob> {
  const agora = deps.now ?? new Date();
  if (!podeProcessarAgora({ kind: job.kind, dueAt: job.dueAt }, agora)) {
    return { status: "aguardando" };
  }

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`retention:${job.eventId}`]);

    const { rows: atualRows } = await cliente.query<{ status: string; attempts: number }>(
      "SELECT status, attempts FROM retention_jobs WHERE id = $1",
      [job.id],
    );
    const atual = atualRows[0];
    if (!atual || (atual.status !== "pending" && atual.status !== "failed")) {
      // Outra invocação, sob o mesmo lock, já tratou este job nesta janela.
      await cliente.query("COMMIT");
      return { status: "done" };
    }

    await cliente.query("SELECT set_config('app.event_id', $1, true)", [job.eventId]);

    const { rows: contaRows } = await cliente.query<{ email: string }>(
      "SELECT a.email AS email FROM events e JOIN accounts a ON a.id = e.account_id WHERE e.id = $1",
      [job.eventId],
    );
    const email = contaRows[0]?.email ?? null;

    if (job.kind === "plus_48h") {
      await cliente.query(
        "UPDATE retention_jobs SET status = 'done', attempts = attempts + 1, completed_at = now() WHERE id = $1",
        [job.id],
      );
      await cliente.query("COMMIT");
      return { status: "done" };
    }

    if (job.kind === "d330_drive" || job.kind === "d358_warn") {
      const resultado = await processarAviso(cliente, job, atual.attempts, agora, email, deps);
      await cliente.query("COMMIT");
      return resultado;
    }

    // d365_delete
    const bestExport = await melhorExportParaRetencao(cliente, job.eventId);
    const publishedAgora = await contarPublicadosAgora(cliente, job.eventId);
    const gate = mayDeleteAtD365({ bestExport, publishedAgora });

    if (!gate.ok) {
      const diasDeAtraso = Math.max(0, Math.floor((agora.getTime() - job.dueAt.getTime()) / 86_400_000));
      await cliente.query(
        "UPDATE retention_jobs SET status = 'failed', last_error = $2, attempts = attempts + 1 WHERE id = $1",
        [job.id, gate.reason],
      );
      if (email) {
        await notificarSemQuebrar(deps, {
          kind: "d365_skip",
          eventId: job.eventId,
          email,
          reason: gate.reason,
          diasDeAtraso,
        });
      }
      await cliente.query("COMMIT");
      return { status: "skipped", reason: gate.reason, diasDeAtraso };
    }

    const chavesParaApagar = await chavesDoAcervo(cliente, job.eventId);
    // Abre o refresh token ANTES do purge — depois dele `drive_connections`
    // vira 'revogado' e `refreshTokenDoEvento` (status-gated) não devolveria
    // mais nada. O chamador revoga no Google DEPOIS do commit (spec §1.6).
    const driveRefreshTokenParaRevogar = deps.vault
      ? await abrirRefreshTokenParaRevogar(cliente, job.eventId, deps.vault)
      : undefined;
    await purgarAcervo(cliente, job.eventId);
    await cliente.query(
      "UPDATE retention_jobs SET status = 'done', attempts = attempts + 1, completed_at = now() WHERE id = $1",
      [job.id],
    );
    await cliente.query("COMMIT");
    return {
      status: "done",
      chavesParaApagar,
      ...(driveRefreshTokenParaRevogar ? { driveRefreshTokenParaRevogar } : {}),
    };
  } catch (e) {
    await cliente.query("ROLLBACK").catch(() => {});
    await pool
      .query(
        "UPDATE retention_jobs SET status = 'failed', last_error = $2, attempts = attempts + 1 WHERE id = $1",
        [job.id, String(e)],
      )
      .catch(() => {});
    return { status: "failed", error: String(e) };
  } finally {
    cliente.release();
  }
}

async function processarAviso(
  cliente: PoolClient,
  job: DueRetentionJob,
  attemptsAtuais: number,
  agora: Date,
  email: string | null,
  deps: DepsProcessarRetencao,
): Promise<ResultadoRetentionJob> {
  const reenvioDias = DIAS_REENVIO[job.kind]!;

  if (attemptsAtuais >= 1) {
    const podeReenviar = agora.getTime() >= job.dueAt.getTime() + reenvioDias * 24 * 3600 * 1000;
    if (!podeReenviar) return { status: "aguardando" };

    if (email) await notificarSemQuebrar(deps, aNotificacao(job, email, agora));
    await cliente.query(
      "UPDATE retention_jobs SET status = 'done', attempts = attempts + 1, completed_at = now() WHERE id = $1",
      [job.id],
    );
    return { status: "done" };
  }

  if (email) await notificarSemQuebrar(deps, aNotificacao(job, email, agora));
  await cliente.query("UPDATE retention_jobs SET attempts = attempts + 1 WHERE id = $1", [job.id]);
  return { status: "done" };
}

function aNotificacao(job: DueRetentionJob, email: string, agora: Date): NotificacaoRetencao {
  if (job.kind === "d330_drive") return { kind: "d330_drive", eventId: job.eventId, email };
  const d365 = planRetention(job.endsAt, new Date(0)).find((i) => i.kind === "d365_delete")!;
  return {
    kind: "d358_warn",
    eventId: job.eventId,
    email,
    diasRestantes: diasRestantesAteD365(d365.dueAt, agora),
  };
}

/** Enriquecimento — nunca derruba o processamento do job (CLAUDE.md §3). */
async function notificarSemQuebrar(deps: DepsProcessarRetencao, n: NotificacaoRetencao): Promise<void> {
  try {
    await deps.notify(n);
  } catch (e) {
    console.warn("retention.notify_falhou", { kind: n.kind, eventId: n.eventId, erro: String(e) });
  }
}

/**
 * O melhor export candidato a cobrir o D365 (spec §5.3) — entre QUALQUER
 * destino (zip conta como backup tanto quanto Drive) e só `mode='full'`
 * (o álbum curado exclui fotos por desenho; nunca cobre o acervo inteiro).
 * `published_snapshot` NULL (jobs anteriores à migration 0041) vira 0 —
 * fail-closed: não há como confiar num export sem saber quanto ele cobriu.
 */
async function melhorExportParaRetencao(
  cliente: PoolClient,
  eventId: string,
): Promise<MelhorExportParaRetencao> {
  const { rows } = await cliente.query<{ state: string; published_snapshot: number | null }>(
    `SELECT state, published_snapshot
       FROM export_jobs
      WHERE event_id = $1 AND (mode = 'full' OR mode IS NULL)
      ORDER BY (state = 'pronto') DESC, COALESCE(published_snapshot, 0) DESC, created_at DESC
      LIMIT 1`,
    [eventId],
  );
  const linha = rows[0];
  if (!linha) return null;

  const estado: "pronto" | "parcial" | "vazio" =
    linha.state === "pronto" ? "pronto" : linha.state === "vazio" ? "vazio" : "parcial";
  return { estado, publishedSnapshot: linha.published_snapshot ?? 0 };
}

async function contarPublicadosAgora(cliente: PoolClient, eventId: string): Promise<number> {
  const { rows } = await cliente.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM uploads WHERE event_id = $1 AND state = 'published'",
    [eventId],
  );
  return rows[0]?.n ?? 0;
}

async function chavesDoAcervo(cliente: PoolClient, eventId: string): Promise<string[]> {
  const { rows } = await cliente.query<{ storage_key: string }>(
    "SELECT storage_key FROM uploads WHERE event_id = $1 AND state IN ('published', 'removed')",
    [eventId],
  );
  return rows.map((r) => r.storage_key);
}

/** Só para o purge do D365 — ignora o gate de status que `refreshTokenDoEvento` aplica, porque aqui rodamos ANTES de marcar revogado. */
async function abrirRefreshTokenParaRevogar(
  cliente: PoolClient,
  eventId: string,
  vault: DriveTokenVault,
): Promise<string | undefined> {
  const { rows } = await cliente.query<{
    refresh_ciphertext: Buffer;
    refresh_iv: Buffer;
    refresh_tag: Buffer;
    key_version: number;
  }>(
    "SELECT refresh_ciphertext, refresh_iv, refresh_tag, key_version FROM drive_connections WHERE event_id = $1",
    [eventId],
  );
  const l = rows[0];
  if (!l) return undefined;

  try {
    return await vault.open({
      ciphertext: l.refresh_ciphertext.toString("base64"),
      iv: l.refresh_iv.toString("base64"),
      tag: l.refresh_tag.toString("base64"),
      keyVersion: l.key_version,
    });
  } catch {
    // Chave rotacionada e indisponível, ou dado corrompido — a revogação no
    // Google é enriquecimento; o purge da nossa cópia segue de qualquer jeito.
    return undefined;
  }
}

/**
 * A parte que o banco garante: os ponteiros somem e a conexão de Drive é
 * revogada. Os bytes no R2 são apagados por quem chama (`chavesParaApagar` no
 * retorno) — `@albora/db` não fala com storage.
 */
async function purgarAcervo(cliente: PoolClient, eventId: string): Promise<void> {
  await cliente.query(
    "UPDATE uploads SET state = 'purged' WHERE event_id = $1 AND state IN ('published', 'removed')",
    [eventId],
  );
  await cliente.query(
    "UPDATE drive_connections SET status = 'revogado', revoked_at = now() WHERE event_id = $1 AND status <> 'revogado'",
    [eventId],
  );
}
