import type { VendorPlanTier } from "@albora/core";
import type { VendorSubscriptionView } from "@/lib/application/use-cases/vendor-billing";

type ResponseBody = { subscription?: VendorSubscriptionView; message?: string };

async function mutate(url: string, init: RequestInit): Promise<VendorSubscriptionView> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as ResponseBody;
  if (!response.ok || !body.subscription) {
    throw new Error(body.message ?? "Não foi possível atualizar a assinatura");
  }
  return body.subscription;
}

export const vendorBillingClient = {
  changePlan(vendorId: string, subscriptionId: string, plan: VendorPlanTier) {
    return mutate(`/api/vendors/${vendorId}/subscription/${subscriptionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan }),
    });
  },
  cancel(vendorId: string, subscriptionId: string) {
    return mutate(`/api/vendors/${vendorId}/subscription/${subscriptionId}`, {
      method: "DELETE",
    });
  },
};
