import pg from "pg";
import { config } from "./config";

/**
 * Pool única por instância.
 *
 * Precisa ser pool com transação, nunca driver HTTP: `SET LOCAL` só existe
 * dentro de uma transação, e sem ela a política de RLS não casa com nada. O
 * sintoma seria "sumiu tudo", não "vazou tudo" — erro silencioso e enganoso
 * (ADR 0006, armadilha 3 da task 003).
 */
let pool: pg.Pool | null = null;

export function banco(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config().databaseUrl,
      max: 5,
      // O caminho crítico não pode ficar pendurado esperando conexão: melhor
      // devolver erro que o cliente reenfileira do que segurar o convidado.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}
