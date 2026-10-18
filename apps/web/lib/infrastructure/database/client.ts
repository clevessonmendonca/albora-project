import pg from "pg";
import { config, ConfigError } from "../../config";

const emWorker = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/** Worker não reaproveita socket aberto por outra requisição (a segunda trava): maxUses 1 descarta a conexão ao devolvê-la. */
const opcoesDeConexao = emWorker ? { maxUses: 1 } : {};

/** Pool única por instância — `SET LOCAL` só existe em transação; sem ela RLS não aplica ("sumiu tudo", não "vazou tudo" — ADR 0006). */
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config().databaseUrl,
      max: 5,
      // O caminho crítico não pode ficar pendurado esperando conexão: melhor
      // devolver erro que o cliente reenfileira do que segurar o convidado.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      ...opcoesDeConexao,
    });
  }
  return pool;
}

let aggregatorPool: pg.Pool | null = null;

/** Pool do `albora_agregador` (BYPASSRLS, migration 0002) — única credencial de `comAgregacao`; nunca cai em `getPool()`: sem `DATABASE_URL_AGGREGATOR` falha alto (zero linhas silenciosas, não erro). */
export function getAggregatorPool(): pg.Pool {
  if (!aggregatorPool) {
    const connectionString = process.env.DATABASE_URL_AGGREGATOR;
    if (!connectionString) throw new ConfigError(["DATABASE_URL_AGGREGATOR"]);

    aggregatorPool = new pg.Pool({
      connectionString,
      max: 3,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      ...opcoesDeConexao,
    });
  }
  return aggregatorPool;
}
