import pg from "pg";
import { config, ConfigError } from "./config";

/**
 * Pool única por instância.
 *
 * Precisa ser pool com transação, nunca driver HTTP: `SET LOCAL` só existe
 * dentro de uma transação, e sem ela a política de RLS não casa com nada. O
 * sintoma seria "sumiu tudo", não "vazou tudo" — erro silencioso e enganoso
 * (ADR 0006, armadilha 3 da task 003).
 */
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
    });
  }
  return pool;
}

let aggregatorPool: pg.Pool | null = null;

/**
 * A segunda pool — conectada como `albora_agregador` (`NOLOGIN BYPASSRLS`
 * até o `ALTER ROLE` de operação, migration 0002), nunca o mesmo papel de
 * `getPool()`. É a única credencial autorizada a entrar em `comAgregacao`
 * (`eventosDoFornecedor`, `marcaPublicaDoFornecedor`, `ativarPlanoDoFornecedor`).
 *
 * 🔴 Passar `getPool()` aqui não estoura — devolve silenciosamente zero
 * linhas ou `permission denied`, porque a RLS de `vendors`/`events` continua
 * ativa sob o papel comum (o mesmo bug de wiring que a V1 documentou em
 * `eventosDoFornecedor`). Por isso esta função nunca cai de volta em
 * `getPool()`: falta de `DATABASE_URL_AGGREGATOR` falha alto, não assume um
 * default inseguro.
 */
export function getAggregatorPool(): pg.Pool {
  if (!aggregatorPool) {
    const connectionString = process.env.DATABASE_URL_AGGREGATOR;
    if (!connectionString) throw new ConfigError(["DATABASE_URL_AGGREGATOR"]);

    aggregatorPool = new pg.Pool({
      connectionString,
      max: 3,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return aggregatorPool;
}
