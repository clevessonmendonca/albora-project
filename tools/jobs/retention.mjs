#!/usr/bin/env node
/**
 * Job runner local de retenção.
 *
 *   DATABASE_URL=... node tools/jobs/retention.mjs
 *
 * D330 = stub Drive. D365 = fail-closed se não houver export.
 */
import pg from "pg";

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_DEV;
if (!url) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

async function main() {
  const { rows: due } = await pool.query(
    `SELECT id, event_id, kind, due_at, attempts
       FROM retention_jobs
      WHERE status IN ('pending', 'failed') AND due_at <= now()
      ORDER BY due_at ASC
      LIMIT 50`,
  );

  console.log(`→ ${due.length} job(s) vencido(s)`);

  for (const job of due) {
    await pool.query(`UPDATE retention_jobs SET status = 'running' WHERE id = $1`, [job.id]);

    const { rows: exports } = await pool.query(
      `SELECT 1 FROM export_jobs
        WHERE event_id = $1 AND state = 'ready'
        LIMIT 1`,
      [job.event_id],
    );
    const exportSucceeded = exports.length > 0;

    if (job.kind === "d365_delete" && !exportSucceeded) {
      console.log(`  skip d365 ${job.event_id} — sem export`);
      await pool.query(
        `UPDATE retention_jobs SET status = 'skipped', last_error = 'export_missing', completed_at = now() WHERE id = $1`,
        [job.id],
      );
      continue;
    }

    console.log(`  ok ${job.kind} ${job.event_id}`);
    await pool.query(
      `UPDATE retention_jobs SET status = 'done', completed_at = now(), attempts = attempts + 1 WHERE id = $1`,
      [job.id],
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
