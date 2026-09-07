import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getAccountDetailAdmin, listAuditLog, type AccountDetailAdmin, type AuditRow } from "@albora/db";
import type { ApproximateMetric } from "../analytics/types";
import { withPlatformAggregation } from "../platform/aggregation";
import { LAST_LOGIN_BASIS } from "./list-accounts";

export type GetAccountInput = { actor: Actor; reason: string; accountId: string };

/**
 * Mesma ressalva de `list-accounts.ts` (T4) — `lastAccessAt` é aproximado
 * por login (`host_sessions.created_at`), não a última ação da conta.
 */
export type AccountDetail = Omit<AccountDetailAdmin, "lastAccessAt"> & {
  lastAccessAt: ApproximateMetric<Date | null>;
  auditTrail: AuditRow[];
};

/** Últimas ações da equipe sobre esta conta — o painel Trilha existe pra isso, não pra listar tudo desde sempre. */
const AUDIT_TRAIL_LIMIT = 20;

/**
 * Único caso de uso da tela Conta — detalhe (§8.1.3): identidade + atividade
 * sob `withPlatformAggregation` (cross-tenant, pool do agregador), e a
 * trilha de auditoria da própria conta por cima.
 *
 * A trilha lê de `deps.pool` (papel `albora_app`), nunca do
 * `aggregatorPool` usado acima — `audit_log` não tem RLS por `event_id`
 * (é dado de plataforma, não de tenant) e a migration 0060 só concede
 * SELECT a `albora_app`; ler pelo agregador falharia por privilégio, não
 * por isolamento.
 */
export async function getAccount(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: GetAccountInput,
): Promise<AccountDetail | null> {
  const conta = await withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "accounts.read",
    reason: input.reason,
    action: "accounts.detail.read",
    run: () => getAccountDetailAdmin(deps.aggregatorPool, input.accountId),
  });
  if (!conta) return null;

  const { rows: auditTrail } = await listAuditLog(deps.pool, {
    targetKind: "account",
    targetId: input.accountId,
    limit: AUDIT_TRAIL_LIMIT,
  });

  const { lastAccessAt, ...resto } = conta;
  return {
    ...resto,
    lastAccessAt: { value: lastAccessAt, approximate: true, approximationBasis: LAST_LOGIN_BASIS },
    auditTrail,
  };
}
