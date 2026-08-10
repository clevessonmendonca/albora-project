import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { migrar } from "../migrar";

const aqui = dirname(fileURLToPath(import.meta.url));
export const DIR_MIGRATIONS = join(aqui, "..", "..", "migrations");

const URL_ADMIN =
  process.env.TEST_DATABASE_URL ?? "postgres://albora:albora@localhost:55432/albora";

export const SENHA_APP = "app-de-teste";

/**
 * Prepara o banco de teste e devolve duas pools.
 *
 * A distinção entre elas é o ponto da suíte inteira: **superuser ignora RLS
 * mesmo com FORCE**. Uma suíte que conecta como dono do container passaria
 * enxergando tudo e diria que o isolamento funciona. Por isso `app` conecta
 * como papel comum, sem BYPASSRLS — do jeito que a aplicação vai conectar.
 */
export async function prepararBanco() {
  const admin = new pg.Pool({ connectionString: URL_ADMIN, max: 4 });

  await admin.query("DROP SCHEMA public CASCADE");
  await admin.query("CREATE SCHEMA public");
  await migrar(admin, DIR_MIGRATIONS);

  // Em produção o login vem de credencial gerenciada; aqui é o mínimo para o
  // papel comum conseguir conectar.
  await admin.query(`ALTER ROLE albora_app LOGIN PASSWORD '${SENHA_APP}'`);
  await admin.query(`ALTER ROLE albora_agregador LOGIN PASSWORD '${SENHA_APP}'`);
  await admin.query("GRANT USAGE ON SCHEMA public TO albora_app, albora_agregador");

  const url = new URL(URL_ADMIN);
  const comoPapel = (papel: string) => {
    const u = new URL(url.toString());
    u.username = papel;
    u.password = SENHA_APP;
    return u.toString();
  };

  return {
    admin,
    app: new pg.Pool({ connectionString: comoPapel("albora_app"), max: 4 }),
    agregador: new pg.Pool({ connectionString: comoPapel("albora_agregador"), max: 2 }),
  };
}

/** Dois eventos com dado próprio. A prova é A nunca enxergar B. */
export async function semear(admin: pg.Pool) {
  const { rows: conta } = await admin.query(
    "INSERT INTO accounts (email) VALUES ('anfitriao@exemplo.test') RETURNING id",
  );
  await admin.query("INSERT INTO packs (id) VALUES ('pack-um'), ('pack-dois')");

  const criar = async (slug: string, pack: string) => {
    const { rows } = await admin.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at)
       VALUES ($1, $2, $3, now(), now() + interval '6 hours') RETURNING id`,
      [conta[0].id, pack, slug],
    );
    const eventoId = rows[0].id as string;

    const { rows: sessao } = await admin.query(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, $2, 'v1', now()) RETURNING id`,
      [eventoId, `convidado-${slug}`],
    );
    const sessaoId = sessao[0].id as string;

    const { rows: upload } = await admin.query(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000) RETURNING id`,
      [eventoId, sessaoId, `events/${eventoId}/2026/08/foto/full`],
    );

    return { eventoId, sessaoId, uploadId: upload[0].id as string };
  };

  return { a: await criar("evento-a", "pack-um"), b: await criar("evento-b", "pack-dois") };
}
