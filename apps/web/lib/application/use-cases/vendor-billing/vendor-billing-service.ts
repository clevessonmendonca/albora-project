import { VENDOR_PLAN_PRICE_CENTS, type VendorPlanTier } from "@albora/core";
import {
  fornecedorParaConta,
  latestVendorSubscriptionForVendor,
  recordVendorSubscriptionCancellationRequest,
  recordVendorSubscriptionPlanChange,
  VendorTeamAccessError,
  type VendorSubscriptionForVendor,
} from "@albora/db";
import type { BillingProvider, PaymentSummary } from "@albora/integrations";
import type { Pool } from "pg";
import {
  auditarAcaoDoFornecedor,
  auditarAssinaturaDoFornecedorNoCliente,
} from "@/features/vendor-portal/lib/audit";

export type VendorBillingActor = { accountId: string; email: string | null };
export type VendorBillingDependencies = {
  pool: Pool;
  billing: Pick<BillingProvider, "listSubscriptionPayments" | "updateSubscription" | "cancelSubscription"> | null;
};

export class VendorBillingUnavailableError extends Error {
  readonly code = "vendor.billing.unavailable";
  constructor() { super("O serviço de cobrança está indisponível agora"); }
}

export class VendorSubscriptionStateError extends Error {
  readonly code = "vendor.subscription.invalid_state";
  constructor(message: string) { super(message); }
}

export type VendorSubscriptionView = Omit<
  VendorSubscriptionForVendor,
  "asaasSubscriptionId" | "accountId" | "createdAt" | "updatedAt" | "cancelRequestedAt"
> & {
  createdAt: string;
  updatedAt: string;
  cancelRequestedAt: string | null;
};

export type VendorBillingView = {
  vendor: { id: string; name: string; slug: string | null; plan: VendorPlanTier };
  subscription: VendorSubscriptionView | null;
  payments: PaymentSummary[];
  providerAvailable: boolean;
  paymentsAvailable: boolean;
};

function publicSubscription(subscription: VendorSubscriptionForVendor): VendorSubscriptionView {
  const { asaasSubscriptionId: _providerId, accountId: _accountId, ...safe } = subscription;
  return {
    ...safe,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
    cancelRequestedAt: subscription.cancelRequestedAt?.toISOString() ?? null,
  };
}

async function requireAdminVendor(
  deps: VendorBillingDependencies,
  actor: VendorBillingActor,
  vendorId: string,
) {
  const vendor = await fornecedorParaConta(deps.pool, actor.accountId, vendorId);
  if (!vendor || vendor.role !== "admin") throw new VendorTeamAccessError();
  return vendor;
}

async function requireSubscription(
  deps: VendorBillingDependencies,
  actor: VendorBillingActor,
  vendorId: string,
  subscriptionId: string,
) {
  const vendor = await requireAdminVendor(deps, actor, vendorId);
  const subscription = await latestVendorSubscriptionForVendor(deps.pool, vendorId);
  if (!subscription || subscription.id !== subscriptionId) throw new VendorTeamAccessError();
  return { vendor, subscription };
}

export async function loadVendorBilling(
  deps: VendorBillingDependencies,
  actor: VendorBillingActor,
  vendorId: string,
): Promise<VendorBillingView> {
  const vendor = await requireAdminVendor(deps, actor, vendorId);
  const subscription = await latestVendorSubscriptionForVendor(deps.pool, vendorId);
  await auditarAcaoDoFornecedor(deps.pool, {
    actorId: actor.accountId,
    actorEmail: actor.email,
    action: "vendor.billing.read",
    vendorId,
    reason: "consultar assinatura e recibos",
  });
  let payments: PaymentSummary[] = [];
  let paymentsAvailable = deps.billing !== null;
  if (subscription && deps.billing) {
    try {
      payments = await deps.billing.listSubscriptionPayments(subscription.asaasSubscriptionId);
    } catch {
      paymentsAvailable = false;
      console.warn("vendor_billing.payments_unavailable", { vendorId });
    }
  }
  return {
    vendor: { id: vendor.id, name: vendor.name, slug: vendor.slug, plan: vendor.plan },
    subscription: subscription ? publicSubscription(subscription) : null,
    payments,
    providerAvailable: deps.billing !== null,
    paymentsAvailable,
  };
}

export async function changeVendorSubscriptionPlan(
  deps: VendorBillingDependencies,
  actor: VendorBillingActor,
  input: { vendorId: string; subscriptionId: string; plan: VendorPlanTier },
): Promise<VendorSubscriptionView> {
  const { subscription } = await requireSubscription(deps, actor, input.vendorId, input.subscriptionId);
  if (!deps.billing) throw new VendorBillingUnavailableError();
  if (subscription.status !== "active") {
    throw new VendorSubscriptionStateError("Regularize a assinatura antes de trocar o plano");
  }
  if (subscription.cancelRequestedAt) {
    throw new VendorSubscriptionStateError("O cancelamento desta assinatura já foi solicitado");
  }
  if ((subscription.pendingPlan ?? subscription.plan) === input.plan) return publicSubscription(subscription);

  const client = await deps.pool.connect();
  try {
    await client.query("BEGIN");
    await auditarAssinaturaDoFornecedorNoCliente(client, {
      actorId: actor.accountId,
      actorEmail: actor.email,
      action: "vendor.subscription.change_plan",
      vendorId: input.vendorId,
      subscriptionId: input.subscriptionId,
      reason: "trocar plano pelo portal do fornecedor",
      metadata: { newPlan: input.plan, amountCents: VENDOR_PLAN_PRICE_CENTS[input.plan] },
    });
    const recorded = await recordVendorSubscriptionPlanChange(
      client,
      input.subscriptionId,
      input.vendorId,
      input.plan,
    );
    if (!recorded) throw new VendorSubscriptionStateError("A assinatura mudou enquanto você editava. Atualize a página");
    await deps.billing.updateSubscription({
      subscriptionId: subscription.asaasSubscriptionId,
      plan: input.plan,
      amountCents: VENDOR_PLAN_PRICE_CENTS[input.plan],
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  const updated = await latestVendorSubscriptionForVendor(deps.pool, input.vendorId);
  if (!updated) throw new VendorTeamAccessError();
  return publicSubscription(updated);
}

export async function cancelVendorSubscription(
  deps: VendorBillingDependencies,
  actor: VendorBillingActor,
  input: { vendorId: string; subscriptionId: string },
): Promise<VendorSubscriptionView> {
  const { subscription } = await requireSubscription(deps, actor, input.vendorId, input.subscriptionId);
  if (!deps.billing) throw new VendorBillingUnavailableError();
  if (subscription.status === "canceled" || subscription.cancelRequestedAt) {
    throw new VendorSubscriptionStateError("O cancelamento desta assinatura já foi solicitado");
  }

  const client = await deps.pool.connect();
  try {
    await client.query("BEGIN");
    await auditarAssinaturaDoFornecedorNoCliente(client, {
      actorId: actor.accountId,
      actorEmail: actor.email,
      action: "vendor.subscription.cancel",
      vendorId: input.vendorId,
      subscriptionId: input.subscriptionId,
      reason: "cancelar assinatura pelo portal do fornecedor",
    });
    const recorded = await recordVendorSubscriptionCancellationRequest(
      client,
      input.subscriptionId,
      input.vendorId,
    );
    if (!recorded) throw new VendorSubscriptionStateError("A assinatura mudou enquanto você editava. Atualize a página");
    await deps.billing.cancelSubscription({ subscriptionId: subscription.asaasSubscriptionId });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  const updated = await latestVendorSubscriptionForVendor(deps.pool, input.vendorId);
  if (!updated) throw new VendorTeamAccessError();
  return publicSubscription(updated);
}
