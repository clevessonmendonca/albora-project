/**
 * O banco entra aqui por dois motivos, e só por eles: provar a idempotência
 * contando linhas, e apagar o que o teste criou.
 *
 * Toda leitura e toda escrita passam por `SET LOCAL app.event_id` dentro de
 * uma transação — a mesma disciplina da aplicação. `SET` de sessão vazaria
 * para o próximo cliente da pool, e a pool aqui é a mesma do dev.
 */

import pg from "pg";

/** @param {Record<string, string|undefined>} env */
export function urlDoBanco(env) {
  return env.CARGA_DATABASE_URL ?? env.DATABASE_URL_DIRECT ?? env.DATABASE_URL ?? null;
}

/** @param {string} url */
export function abrir(url) {
  return new pg.Pool({ connectionString: url, max: 4 });
}

async function comEvento(pool, eventoId, executar) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.event_id', $1, true)", [eventoId]);
    const r = await executar(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/**
 * Quantas linhas existem para cada `uploadId`. É a prova de que o `confirm`
 * concorrente não duplicou — contada no banco, não deduzida da resposta HTTP.
 *
 * @returns {Promise<Map<string, number>>}
 */
export async function contarUploads(pool, eventoId, uploadIds) {
  if (uploadIds.length === 0) return new Map();

  return comEvento(pool, eventoId, async (c) => {
    const { rows } = await c.query(
      "SELECT id, count(*)::int AS n FROM uploads WHERE id = ANY($1::uuid[]) GROUP BY id",
      [uploadIds],
    );

    const contagem = new Map(uploadIds.map((id) => [id, 0]));
    for (const r of rows) contagem.set(r.id, r.n);
    return contagem;
  });
}

/**
 * Apaga exatamente as linhas desta execução, nunca por varredura de evento: o
 * evento de teste pode ter dado semeado que ninguém quer perder.
 *
 * @param {{uploadIds:string[], sessaoIds:string[]}} criados
 */
export async function apagarExecucao(pool, eventoId, { uploadIds, sessaoIds }) {
  return comEvento(pool, eventoId, async (c) => {
    const uploads = await c.query("DELETE FROM uploads WHERE id = ANY($1::uuid[])", [uploadIds]);

    // Fora da RLS por desenho (migration 0003) — e sem FK para guest_sessions,
    // então não some por cascata. Precisa de linha própria.
    const tokens = await c.query("DELETE FROM session_tokens WHERE session_id = ANY($1::uuid[])", [
      sessaoIds,
    ]);

    const sessoes = await c.query("DELETE FROM guest_sessions WHERE id = ANY($1::uuid[])", [
      sessaoIds,
    ]);

    return {
      uploads: uploads.rowCount ?? 0,
      tokens: tokens.rowCount ?? 0,
      sessoes: sessoes.rowCount ?? 0,
    };
  });
}
