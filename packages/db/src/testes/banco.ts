import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { migrar } from "../migrar";

const aqui = dirname(fileURLToPath(import.meta.url));
export const DIR_MIGRATIONS = join(aqui, "..", "..", "migrations");

const URL_ADMIN =
  process.env.TEST_DATABASE_URL ?? "postgres://albora:albora@localhost:55432/albora";

export const SENHA_APP = "app-de-teste";

/** `app` conecta como `albora_app` (sem BYPASSRLS) — superuser ignora RLS mesmo com FORCE; uma suíte conectada como dono diria que o isolamento funciona. */
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

/** Dois eventos sob contas distintas (ADR 0013) — A nunca enxerga evento de B, nem por event_id nem por account_id. */
export async function semear(admin: pg.Pool) {
  const conta = async (email: string) => {
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
      email,
    ]);
    return rows[0].id as string;
  };
  const contaAId = await conta("anfitriao-a@exemplo.test");
  const contaBId = await conta("anfitriao-b@exemplo.test");
  await admin.query("INSERT INTO packs (id) VALUES ('pack-um'), ('pack-dois')");

  const criar = async (slug: string, pack: string, accountId: string) => {
    const { rows } = await admin.query(
      // status explícito: sem isso o DEFAULT 'draft' (migration 0056) faria
      // todo evento semeado nascer em rascunho, e a suíte inteira assume
      // evento já publicado — só o gap I1 (task 6) testa 'draft' de propósito.
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
       VALUES ($1, $2, $3, now(), now() + interval '6 hours', 'active') RETURNING id`,
      [accountId, pack, slug],
    );
    const eventoId = rows[0].id as string;

    // O slug vive na porta fora da RLS (migration 0004); a migration faz
    // backfill de quem já existia, e quem nasce depois precisa da linha.
    await admin.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [
      slug,
      eventoId,
    ]);

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

  return {
    a: { ...(await criar("evento-a", "pack-um", contaAId)), contaId: contaAId },
    b: { ...(await criar("evento-b", "pack-dois", contaBId)), contaId: contaBId },
  };
}
