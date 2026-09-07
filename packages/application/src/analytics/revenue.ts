import type { Pool } from "pg";
import { logger, VENDOR_PLAN_PRICE_CENTS, type Actor } from "@albora/core";
// Re-export fino: quem já importava de "./revenue" continua, com a fonte única em core.
export { VENDOR_PLAN_PRICE_CENTS };
import { withPlatformAggregation } from "../platform/aggregation";
import type { ApproximateMetric } from "./types";



export type LinhaPlanoStatus = { plan: string; status: string; n: number };

/**
 * Soma pura, isolada da query para poder ser testada sem banco.
 *
 * Plano sem preço no mapa NÃO entra no MRR e é devolvido em `unknownPlans`:
 * `undefined * n` daria `NaN`, e um `NaN` somado ao MRR se propaga em silêncio
 * até o painel do dono — pior que faltar a linha, porque parece um número.
 * Hoje o CHECK da migration 0037 restringe a 'starter'|'studio'|'agency', então
 * isso só acende se alguém adicionar plano sem atualizar o mapa de preço.
 */
export function computeRevenueTotals(linhas: readonly LinhaPlanoStatus[]): {
  mrrCents: number;
  activeSubscriptions: number;
  overdueCount: number;
  unknownPlans: string[];
} {
  let mrrCents = 0;
  let activeSubscriptions = 0;
  let overdueCount = 0;
  const unknownPlans = new Set<string>();

  for (const linha of linhas) {
    if (linha.status === "active") {
      const preco = VENDOR_PLAN_PRICE_CENTS[linha.plan as keyof typeof VENDOR_PLAN_PRICE_CENTS];
      if (typeof preco !== "number") {
        unknownPlans.add(linha.plan);
      } else {
        mrrCents += preco * linha.n;
      }
      activeSubscriptions += linha.n;
    }
    if (linha.status === "overdue") overdueCount += linha.n;
  }

  return { mrrCents, activeSubscriptions, overdueCount, unknownPlans: [...unknownPlans] };
}

export type PlatformRevenue = {
  mrrCents: number;
  activeSubscriptions: number;
  /** Contagem, nunca R$ — `vendor_subscriptions` não tem `amount_cents` (lacuna dura, não invento a coluna). */
  overdueCount: number;
  /** Ruling do controlador: `vendor_subscriptions` não tem `canceled_at` — proxy por `updated_at` marcado até a UI. */
  churned30d: ApproximateMetric<number>;
  vendorsByPlan: { plan: string; count: number }[];
};

export type PlatformRevenueInput = { actor: Actor; reason: string };

export async function getPlatformRevenue(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: PlatformRevenueInput,
): Promise<PlatformRevenue> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "analytics.platform.read",
    reason: input.reason,
    action: "analytics.revenue.read",
    run: async () => {
      const { rows: porPlanoEStatus } = await deps.aggregatorPool.query<{
        plan: "starter" | "studio" | "agency";
        status: "pending" | "active" | "overdue" | "canceled";
        n: number;
      }>(`SELECT plan, status, count(*)::int AS n FROM vendor_subscriptions GROUP BY plan, status`);

      const { rows: porPlanoVendor } = await deps.aggregatorPool.query<{ plan: string; n: number }>(
        `SELECT plan, count(*)::int AS n FROM vendors GROUP BY plan`,
      );

      const { rows: churn } = await deps.aggregatorPool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM vendor_subscriptions
          WHERE status = 'canceled' AND updated_at >= now() - interval '30 days'`,
      );

      const { mrrCents, activeSubscriptions, overdueCount, unknownPlans } =
        computeRevenueTotals(porPlanoEStatus);
      if (unknownPlans.length > 0) {
        logger.warn("analytics.revenue.plano_sem_preco", { plans: unknownPlans });
      }

      return {
        mrrCents,
        activeSubscriptions,
        overdueCount,
        churned30d: {
          value: churn[0]?.n ?? 0,
          approximate: true,
          approximationBasis: "última atualização do registro (sem canceled_at dedicado)",
        },
        vendorsByPlan: porPlanoVendor.map((r) => ({ plan: r.plan, count: r.n })),
      };
    },
  });
}
