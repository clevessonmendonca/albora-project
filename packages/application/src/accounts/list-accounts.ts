import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import {
  listAccountsAdmin,
  type AccountAdminRow as AccountAdminRowDb,
  type AccountAdminStatus,
  type AccountAdminType,
} from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";
import type { ApproximateMetric } from "../analytics/types";

export type { AccountAdminStatus, AccountAdminType } from "@albora/db";

/** Ninguém escreveu a query que produz esse número duas vezes; é a mesma
 * ressalva descrita em `accounts-admin.ts`, só que carregada até quem lê o
 * dado, não apenas quem escreveu a query. */
const LAST_LOGIN_BASIS =
  "aproximado por último login (host_sessions.created_at) — não é a última ação, porque accounts não guarda last_used_at de host";

/**
 * Reaproveitado por T5 (detalhe da conta). `lastAccessAt` sai de `@albora/db`
 * como `Date | null` bruto; aqui vira `ApproximateMetric` porque é aproximação
 * (login, não ação) — a ressalva do comentário de `listAccountsAdmin` precisa
 * chegar até quem decide em cima do número, não só até quem escreveu a query
 * (ruling do controlador, Onda B).
 */
export type AccountAdminRow = Omit<AccountAdminRowDb, "lastAccessAt"> & {
  lastAccessAt: ApproximateMetric<Date | null>;
};

function toAccountAdminRow(row: AccountAdminRowDb): AccountAdminRow {
  const { lastAccessAt, ...resto } = row;
  return {
    ...resto,
    lastAccessAt: { value: lastAccessAt, approximate: true, approximationBasis: LAST_LOGIN_BASIS },
  };
}

export type ListAccountsInput = {
  actor: Actor;
  reason: string;
  type?: AccountAdminType;
  plan?: string;
  status?: AccountAdminStatus;
  search?: string;
  limit: number;
  cursor?: string;
};

/** Único caso de uso da tela Contas — leitura cross-conta sob `withPlatformAggregation` (§8.1.2). */
export async function listAccounts(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListAccountsInput,
): Promise<{ rows: AccountAdminRow[]; nextCursor: string | null }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "accounts.read",
    reason: input.reason,
    action: "accounts.list.read",
    run: async () => {
      const { rows, nextCursor } = await listAccountsAdmin(deps.aggregatorPool, {
        ...(input.type ? { type: input.type } : {}),
        ...(input.plan ? { plan: input.plan } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.search ? { search: input.search } : {}),
        limit: input.limit,
        ...(input.cursor ? { cursor: input.cursor } : {}),
      });
      return { rows: rows.map(toAccountAdminRow), nextCursor };
    },
  });
}
