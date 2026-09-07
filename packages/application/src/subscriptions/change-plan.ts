import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getVendorSubscriptionByIdAdmin } from "@albora/db";
import { executeCommand } from "../envelope/command";
import type { SubscriptionBillingPort } from "./billing-port";

export type ChangeSubscriptionPlanInput = {
  actor: Actor;
  reason: string;
  subscriptionId: string;
  newPlan: "starter" | "studio" | "agency";
  amountCents: number;
};

/** Nunca mexe em vendor_subscriptions direto — só chama o provider; o webhook (billing_webhook_events, idempotente) continua sendo quem confirma o estado local. */
export async function changeSubscriptionPlan(
  deps: { pool: Pool; billing: Pick<SubscriptionBillingPort, "updateSubscription"> },
  input: ChangeSubscriptionPlanInput,
): Promise<{ status: string }> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "subscription.mutate",
    reason: input.reason,
    target: { kind: "subscription", id: input.subscriptionId },
    action: "subscription.change_plan",
    metadata: { newPlan: input.newPlan, amountCents: input.amountCents },
    run: async () => {
      const assinatura = await getVendorSubscriptionByIdAdmin(deps.pool, input.subscriptionId);
      if (!assinatura) throw new Error(`assinatura ${input.subscriptionId} não encontrada`);
      return deps.billing.updateSubscription({
        subscriptionId: assinatura.asaasSubscriptionId,
        plan: input.newPlan,
        amountCents: input.amountCents,
      });
    },
  });
}
