import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getVendorSubscriptionByIdAdmin } from "@albora/db";
import { executeCommand } from "../envelope/command";
import type { SubscriptionBillingPort } from "./billing-port";

export type CancelSubscriptionInput = { actor: Actor; reason: string; subscriptionId: string };

/** Cancelamento é DELETE no Asaas — nunca `vendor_subscriptions.status = 'canceled'` na mão; o webhook marca o status local quando o Asaas confirmar. */
export async function cancelSubscription(
  deps: { pool: Pool; billing: Pick<SubscriptionBillingPort, "cancelSubscription"> },
  input: CancelSubscriptionInput,
): Promise<{ status: string }> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "subscription.mutate",
    reason: input.reason,
    target: { kind: "subscription", id: input.subscriptionId },
    action: "subscription.cancel",
    run: async () => {
      const assinatura = await getVendorSubscriptionByIdAdmin(deps.pool, input.subscriptionId);
      if (!assinatura) throw new Error(`assinatura ${input.subscriptionId} não encontrada`);
      return deps.billing.cancelSubscription({ subscriptionId: assinatura.asaasSubscriptionId });
    },
  });
}
