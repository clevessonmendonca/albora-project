import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import {
  listVendorSubscriptionsAdmin,
  type VendorSubscriptionAdminRow as VendorSubscriptionAdminRowDb,
} from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";
import type { ApproximateMetric } from "../analytics/types";

/**
 * Reaproveitado pela tela (`apps/web/.../subscriptions/page.tsx`) e por
 * quem testar o texto de apoio — mesma disciplina de `LAST_LOGIN_BASIS`
 * em `list-accounts.ts`: um texto só, citado nos dois lados, em vez de
 * duas frases que podem divergir com o tempo.
 */
export const OVERDUE_DAYS_BASIS =
  "aproximado por now() - updated_at (vendor_subscriptions não tem overdue_since dedicado) — só é exato se nada mais tocar updated_at enquanto a assinatura segue em atraso";

/**
 * `overdueDays` sai de `@albora/db` como `number | null` bruto; aqui vira
 * `ApproximateMetric` só quando não é `null` — é aproximação (proxy por
 * `updated_at`, não uma coluna `overdue_since`), e a ressalva precisa
 * chegar até quem decide em cima do número, não só até quem escreveu a
 * query (ruling do controlador, Onda B — mesmo tratamento de
 * `lastAccessAt` em `list-accounts.ts`).
 */
export type VendorSubscriptionAdminRow = Omit<VendorSubscriptionAdminRowDb, "overdueDays"> & {
  overdueDays: ApproximateMetric<number> | null;
};

function toVendorSubscriptionAdminRow(row: VendorSubscriptionAdminRowDb): VendorSubscriptionAdminRow {
  const { overdueDays, ...resto } = row;
  return {
    ...resto,
    overdueDays:
      overdueDays === null ? null : { value: overdueDays, approximate: true, approximationBasis: OVERDUE_DAYS_BASIS },
  };
}

export type ListSubscriptionsInput = {
  actor: Actor;
  reason: string;
  status?: VendorSubscriptionAdminRowDb["status"];
  limit: number;
};

/** Único caso de uso da tela Assinaturas — leitura cross-vendor sob `withPlatformAggregation` (§8.1.5). Só leitura: mutação de plano/reembolso chega na Onda C. */
export async function listSubscriptions(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListSubscriptionsInput,
): Promise<{ rows: VendorSubscriptionAdminRow[]; nextCursor: null }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "subscription.read",
    reason: input.reason,
    action: "subscriptions.list.read",
    run: async () => {
      const { rows } = await listVendorSubscriptionsAdmin(deps.aggregatorPool, {
        ...(input.status ? { status: input.status } : {}),
        limit: input.limit,
      });
      return { rows: rows.map(toVendorSubscriptionAdminRow), nextCursor: null };
    },
  });
}
