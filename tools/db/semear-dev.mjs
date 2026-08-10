import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

/**
 * Banco de desenvolvimento: migrations + um evento aberto para abrir no
 * navegador.
 *
 * Separado do seed dos testes de propósito. O de teste derruba o schema a
 * cada execução; este preserva, porque quem está desenvolvendo tela não quer
 * perder o evento que acabou de abrir a cada `pnpm test`.
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const dirMigrations = join(aqui, "..", "..", "packages", "db", "migrations");

const url =
  process.env.DATABASE_URL_DEV ?? "postgres://albora:albora@localhost:55432/albora";

const pool = new pg.Pool({ connectionString: url });

async function migrar() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      nome text PRIMARY KEY,
      aplicada_em timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query("SELECT nome FROM _migrations");
  const feitas = new Set(rows.map((r) => r.nome));

  for (const nome of readdirSync(dirMigrations).filter((n) => n.endsWith(".sql")).sort()) {
    if (feitas.has(nome)) continue;
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query(readFileSync(join(dirMigrations, nome), "utf8"));
      await c.query("INSERT INTO _migrations (nome) VALUES ($1)", [nome]);
      await c.query("COMMIT");
      console.log(`  aplicada  ${nome}`);
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      throw new Error(`migration ${nome}: ${e.message}`);
    } finally {
      c.release();
    }
  }
}

const SLUG = "festa-demo";

async function semear() {
  const { rows: existente } = await pool.query(
    "SELECT event_id FROM event_slugs WHERE slug = $1",
    [SLUG],
  );

  if (existente[0]) {
    // Reexecutar precisa ser seguro: quem está mexendo em tela roda isto
    // várias vezes por hora.
    await pool.query(
      "UPDATE events SET starts_at = now() - interval '1 hour', ends_at = now() + interval '6 hours' WHERE id = $1",
      [existente[0].event_id],
    );
    return existente[0].event_id;
  }

  const { rows: conta } = await pool.query(
    `INSERT INTO accounts (email) VALUES ('dev@albora.test')
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
  );
  await pool.query(
    "INSERT INTO packs (id) VALUES ('casamento'), ('quinze-anos') ON CONFLICT DO NOTHING",
  );

  const { rows: evento } = await pool.query(
    `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, interaction_opens_at)
     VALUES ($1, 'casamento', $2, now() - interval '1 hour', now() + interval '6 hours', now() + interval '2 hours')
     RETURNING id`,
    [conta[0].id, SLUG],
  );
  const eventoId = evento[0].id;

  await pool.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [SLUG, eventoId]);

  // Um segundo evento, já encerrado, para conferir a tela de "já foi" sem
  // ter de mexer no relógio.
  const { rows: velho } = await pool.query(
    `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at)
     VALUES ($1, 'quinze-anos', 'festa-encerrada', now() - interval '10 days', now() - interval '9 days')
     RETURNING id`,
    [conta[0].id],
  );
  await pool.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [
    "festa-encerrada",
    velho[0].id,
  ]);

  return eventoId;
}

try {
  console.log("→ migrations");
  await migrar();
  console.log("→ seed");
  const eventoId = await semear();

  console.log(`
Pronto. Abra no navegador:

  aberta       http://localhost:3000/e/${SLUG}
  encerrada    http://localhost:3000/e/festa-encerrada
  inexistente  http://localhost:3000/e/nao-existe

  event_id: ${eventoId}
`);
} finally {
  await pool.end();
}
