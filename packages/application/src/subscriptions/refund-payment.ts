import type { Pool } from "pg";
import type { Actor, Capability } from "@albora/core";
import { REFUND_APPROVAL_THRESHOLD_CENTS } from "@albora/core";
import { executeCommand } from "../envelope/command";
import type { SubscriptionBillingPort } from "./billing-port";

export type RefundPaymentInput = {
  actor: Actor;
  reason: string;
  paymentId: string;
  asaasPaymentId: string;
  amountCents: number;
};

/**
 * `refundPolicy()` (Onda A, `packages/core/src/authorization/policies.ts`)
 * devolve `needsApproval` incondicional acima do limiar, para QUALQUER
 * ator — inclusive o dono, se checado por `subscription.refund`. A ruling
 * da espinha ("só o dono executa, não existe fila") vira código aqui: acima
 * do limiar, o comando checa `subscription.refund.approve` (só o dono tem,
 * sem política extra) em vez de `subscription.refund`. Financeiro tentando
 * reembolso grande recebe `CommandDeniedError` de `hasCapability` — uma
 * negação simples, não uma fila de aprovação.
 */
export async function refundPayment(
  deps: { pool: Pool; billing: Pick<SubscriptionBillingPort, "refundPayment"> },
  input: RefundPaymentInput,
): Promise<{ status: string }> {
  const capability: Capability =
    input.amountCents > REFUND_APPROVAL_THRESHOLD_CENTS ? "subscription.refund.approve" : "subscription.refund";

  return executeCommand(deps, {
    actor: input.actor,
    capability,
    reason: input.reason,
    target: { kind: "payment", id: input.paymentId },
    action: "subscription.refund",
    context: { amountCents: input.amountCents },
    metadata: { amountCents: input.amountCents },
    run: () => deps.billing.refundPayment({ paymentId: input.asaasPaymentId, amountCents: input.amountCents }),
  });
}
