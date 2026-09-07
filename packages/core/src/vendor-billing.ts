/**
 * Preço mensal por tier de fornecedor, em centavos — **fonte única**.
 *
 * Vivia duplicado em `apps/web/lib/billing/types.ts` e
 * `packages/application/src/analytics/revenue.ts`, cada um com um comentário
 * pedindo para manter o outro sincronizado. Sincronizar valor de dinheiro na
 * mão é como o MRR passa a mentir sem ninguém notar. Domínio puro (`core`)
 * pode ser importado tanto por `apps/web` quanto por `packages/application`,
 * então é aqui que ele mora.
 *
 * O tipo literal é a fonte da verdade dos tiers; `VendorPlan` em
 * `packages/db` precisa listar exatamente estes três, e há teste de tipo
 * garantindo (vendor-billing.test.ts).
 */
export type VendorPlanTier = "starter" | "studio" | "agency";

export const VENDOR_PLAN_PRICE_CENTS: Record<VendorPlanTier, number> = {
  starter: 9900,
  studio: 24900,
  agency: 59900,
};
