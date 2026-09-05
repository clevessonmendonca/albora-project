import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { withPlatformAggregation } from "../platform/aggregation";
import type { ApproximateMetric } from "./types";

/**
 * Duplicado de `apps/web/lib/billing/types.ts` — `packages/application` não
 * pode importar de `apps/web` (direção é `app → application`, nunca o
 * contrário). Mesmo padrão do rate-limiter da Onda A (T10, nota 6). Se o
 * preço mudar lá, muda aqui também — os dois lados citam um ao outro em
 * comentário.
 * @see apps/web/lib/billing/types.ts VENDOR_PLAN_PRICE_CENTS
 */
export const VENDOR_PLAN_PRICE_CENTS: Record<"starter" | "studio" | "agency", number> = {
  starter: 9900,
  studio: 24900,
  agency: 59900,
};

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

      let mrrCents = 0;
      let activeSubscriptions = 0;
      let overdueCount = 0;
      for (const linha of porPlanoEStatus) {
        if (linha.status === "active") {
          mrrCents += VENDOR_PLAN_PRICE_CENTS[linha.plan] * linha.n;
          activeSubscriptions += linha.n;
        }
        if (linha.status === "overdue") overdueCount += linha.n;
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
