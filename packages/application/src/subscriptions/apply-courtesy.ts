import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getVendorSubscriptionByIdAdmin } from "@albora/db";
import { executeCommand } from "../envelope/command";
import type { SubscriptionBillingPort } from "./billing-port";

export type ApplySubscriptionCourtesyInput = {
  actor: Actor;
  reason: string;
  subscriptionId: string;
  discountPercent: number;
};

/** Mesmo caminho de `changeSubscriptionPlan` (PUT /subscriptions/{id} no Asaas) — cortesia é desconto, não status novo; o webhook segue sendo quem confirma o estado local. */
export async function applySubscriptionCourtesy(
  deps: { pool: Pool; billing: Pick<SubscriptionBillingPort, "updateSubscription"> },
  input: ApplySubscriptionCourtesyInput,
): Promise<{ status: string }> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "subscription.mutate",
    reason: input.reason,
    target: { kind: "subscription", id: input.subscriptionId },
    action: "subscription.courtesy",
    metadata: { discountPercent: input.discountPercent },
    run: async () => {
      const assinatura = await getVendorSubscriptionByIdAdmin(deps.pool, input.subscriptionId);
      if (!assinatura) throw new Error(`assinatura ${input.subscriptionId} não encontrada`);
      return deps.billing.updateSubscription({
        subscriptionId: assinatura.asaasSubscriptionId,
        discountPercent: input.discountPercent,
      });
    },
  });
}
