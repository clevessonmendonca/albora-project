import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";

/**
 * Aplica migrations em ordem, uma vez cada.
 *
 * Forward-only: nenhuma migration ja aplicada e reescrita. Se a decisao
 * mudar, escreve-se outra — reescrever uma que ja rodou causa desvio de
 * schema entre replicas e backup que nao restaura.
 */
export async function migrar(pool: Pool, diretorio: string): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      nome        text PRIMARY KEY,
      aplicada_em timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query<{ nome: string }>("SELECT nome FROM _migrations");
  const jaAplicadas = new Set(rows.map((r) => r.nome));

  const arquivos = readdirSync(diretorio)
    .filter((n) => n.endsWith(".sql"))
    .sort();

  const aplicadas: string[] = [];

  for (const nome of arquivos) {
    if (jaAplicadas.has(nome)) continue;

    const sql = readFileSync(join(diretorio, nome), "utf8");
    const cliente = await pool.connect();
    try {
      // DDL em transação: uma migration que falha no meio não deixa metade
      // do schema aplicada, que é o estado impossível de diagnosticar.
      await cliente.query("BEGIN");
      await cliente.query(sql);
      await cliente.query("INSERT INTO _migrations (nome) VALUES ($1)", [nome]);
      await cliente.query("COMMIT");
      aplicadas.push(nome);
    } catch (erro) {
      await cliente.query("ROLLBACK").catch(() => {});
      throw new Error(`migration ${nome} falhou: ${String(erro)}`, { cause: erro });
    } finally {
      cliente.release();
    }
  }

  return aplicadas;
}
