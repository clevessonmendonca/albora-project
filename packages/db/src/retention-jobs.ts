import type { Pool } from "pg";
import { mayDeleteAtD365, planRetention, type RetentionKind } from "@albora/core";
import { comEvento } from "./event";

export async function scheduleRetentionJobs(
  pool: Pool,
  eventId: string,
  endsAt: Date,
): Promise<void> {
  const items = planRetention(endsAt);
  await comEvento(pool, eventId, async (c) => {
    for (const item of items) {
      await c.query(
        `INSERT INTO retention_jobs (event_id, kind, due_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, kind) DO NOTHING`,
        [eventId, item.kind, item.dueAt],
      );
    }
  });
}

export type DueRetentionJob = {
  id: string;
  eventId: string;
  kind: RetentionKind;
  dueAt: Date;
  attempts: number;
};

/** Lista jobs vencidos — usa pool sem RLS de evento (job runner). */
export async function listDueRetentionJobs(pool: Pool, limit = 20): Promise<DueRetentionJob[]> {
  const { rows } = await pool.query<{
    id: string;
    event_id: string;
    kind: RetentionKind;
    due_at: Date;
    attempts: number;
  }>(
    `SELECT id, event_id, kind, due_at, attempts
       FROM retention_jobs
      WHERE status IN ('pending', 'failed') AND due_at <= now()
      ORDER BY due_at ASC
      LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    kind: r.kind,
    dueAt: r.due_at,
    attempts: r.attempts,
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

/**
 * Processa um job. Drive D330 é stub (marca done). D365 fail-closed.
 */
export async function processRetentionJob(
  pool: Pool,
  job: DueRetentionJob,
  opts: { exportSucceeded: boolean; driveStubDone?: boolean },
): Promise<"done" | "skipped" | "failed"> {
  await markRetentionJob(pool, job.id, "running");
  try {
    if (job.kind === "plus_48h") {
      console.log("retention.plus_48h", { eventId: job.eventId });
      await markRetentionJob(pool, job.id, "done");
      return "done";
    }
    if (job.kind === "d330_drive") {
      console.log("retention.d330_drive_stub", { eventId: job.eventId });
      await markRetentionJob(pool, job.id, "done");
      return "done";
    }
    const gate = mayDeleteAtD365({
      exportSucceeded: opts.exportSucceeded,
      driveStubDone: opts.driveStubDone ?? false,
    });
    if (!gate.ok) {
      console.warn("retention.d365_skip", { eventId: job.eventId, reason: gate.reason });
      await markRetentionJob(pool, job.id, "skipped", gate.reason);
      return "skipped";
    }
    console.log("retention.d365_delete_stub", { eventId: job.eventId });
    await markRetentionJob(pool, job.id, "done");
    return "done";
  } catch (e) {
    await markRetentionJob(pool, job.id, "failed", String(e));
    return "failed";
  }
}
