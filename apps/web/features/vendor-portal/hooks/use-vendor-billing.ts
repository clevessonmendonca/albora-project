"use client";

import { useState } from "react";
import type { VendorPlanTier } from "@albora/core";
import type { VendorSubscriptionView } from "@/lib/application/use-cases/vendor-billing";
import { vendorBillingClient } from "../services/vendor-billing-client";

type Operation = "plan" | "cancel" | null;

export function useVendorBilling(vendorId: string, initialSubscription: VendorSubscriptionView | null) {
  const [subscription, setSubscription] = useState(initialSubscription);
  const [operation, setOperation] = useState<Operation>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function run(
    operationName: Exclude<Operation, null>,
    task: () => Promise<VendorSubscriptionView>,
    message: string,
  ) {
    setOperation(operationName);
    setFeedback(null);
    try {
      setSubscription(await task());
      setFeedback({ kind: "success", message });
      return true;
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Não foi possível atualizar a assinatura",
      });
      return false;
    } finally {
      setOperation(null);
    }
  }

  return {
    subscription,
    operation,
    feedback,
    changePlan: (plan: VendorPlanTier) =>
      run(
        "plan",
        () => vendorBillingClient.changePlan(vendorId, subscription!.id, plan),
        "Troca registrada. O novo plano entra após a confirmação do provedor.",
      ),
    cancel: () =>
      run(
        "cancel",
        () => vendorBillingClient.cancel(vendorId, subscription!.id),
        "Cancelamento solicitado. Você mantém o acesso enquanto o provedor conclui a solicitação.",
      ),
  };
}
