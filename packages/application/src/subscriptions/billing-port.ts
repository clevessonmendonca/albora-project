/**
 * Porta local, compatível estruturalmente com `BillingProvider`
 * (`apps/web/lib/billing/types.ts`) — `packages/application` nunca importa
 * de `apps/web` (ADR 0016 §1: direção `app -> application`, nunca o
 * contrário). `packages/integrations` ainda não existe (Lacunas); a rota
 * constrói o provider real via `getBillingProvider()` e passa aqui como
 * `deps.billing` — TypeScript aceita por shape, sem import cruzado.
 */
export type SubscriptionBillingPort = {
  updateSubscription(input: {
    subscriptionId: string;
    plan?: "starter" | "studio" | "agency";
    amountCents?: number;
    discountPercent?: number;
  }): Promise<{ status: string }>;
  cancelSubscription(input: { subscriptionId: string }): Promise<{ status: string }>;
  refundPayment(input: { paymentId: string; amountCents?: number }): Promise<{ status: string }>;
};
