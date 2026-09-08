import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listRefundablePaymentsForVendor, type RefundablePaymentRow } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type { RefundablePaymentRow };

export type ListRefundablePaymentsInput = {
  actor: Actor;
  reason: string;
  vendorId: string;
};

/**
 * Alimenta o seletor de pagamento de `SubscriptionActions` (T6, dívida da
 * Onda D). Capability é `subscription.read`, não `subscription.refund`:
 * `refundPolicy()` (`packages/core/src/authorization/policies.ts`) exige
 * `context.amountCents` numérico — ela decide sobre uma execução de valor
 * já escolhido, não sobre "pode ver a lista". Chamar `authorize` com
 * `subscription.refund` aqui sempre negaria ("valor do reembolso é
 * obrigatório"), porque ainda não existe valor: é exatamente o que esta
 * leitura ainda não decidiu. Na prática o alcance é o mesmo: a tela só
 * invoca este caso de uso quando `podeReembolsar` já é verdadeiro
 * (`subscriptions/page.tsx`), e nenhum papel tem `subscription.refund`/
 * `.approve` sem também ter `subscription.read` (`roles.ts`).
 *
 * Cross-evento por desenho (o vínculo é `billing_payments.event_id →
 * events.vendor_id`, e `events` tem RLS forçada) — por isso
 * `withPlatformAggregation`, não `executeQuery`: nunca dá pra chegar aos
 * eventos de outros hosts sob o pool comum, mesmo escopando por
 * `vendorId` na query.
 */
export async function listRefundablePayments(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListRefundablePaymentsInput,
): Promise<{ rows: RefundablePaymentRow[] }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "subscription.read",
    reason: input.reason,
    action: "subscription.refundable_payments.read",
    run: async () => ({ rows: await listRefundablePaymentsForVendor(deps.aggregatorPool, input.vendorId) }),
  });
}
