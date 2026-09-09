import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  fornecedorParaConta: vi.fn(),
  latestVendorSubscriptionForVendor: vi.fn(),
  recordVendorSubscriptionCancellationRequest: vi.fn(),
  recordVendorSubscriptionPlanChange: vi.fn(),
}));
const audit = vi.hoisted(() => ({
  auditarAcaoDoFornecedor: vi.fn(),
  auditarAssinaturaDoFornecedorNoCliente: vi.fn(),
}));

vi.mock("@albora/db", () => ({
  ...db,
  VendorTeamAccessError: class VendorTeamAccessError extends Error {},
}));
vi.mock("@/features/vendor-portal/lib/audit", () => audit);

const service = await import("./vendor-billing-service");

const vendor = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Studio Aurora",
  slug: "aurora",
  plan: "studio",
  role: "admin",
  status: "active",
  brandTokens: {},
} as const;
const subscription = {
  id: "33333333-3333-3333-3333-333333333333",
  vendorId: vendor.id,
  accountId: "11111111-1111-1111-1111-111111111111",
  asaasSubscriptionId: "sub_asaas_secret",
  status: "active",
  plan: "studio",
  pendingPlan: null,
  cancelRequestedAt: null,
  createdAt: new Date("2026-08-01T12:00:00Z"),
  updatedAt: new Date("2026-09-01T12:00:00Z"),
} as const;
const actor = { accountId: subscription.accountId, email: "admin@aurora.test" };
const client = { query: vi.fn(), release: vi.fn() };
const billing = {
  listSubscriptionPayments: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
};
const deps = {
  pool: { connect: vi.fn(async () => client) } as never,
  billing,
};

beforeEach(() => {
  vi.clearAllMocks();
  db.fornecedorParaConta.mockResolvedValue(vendor);
  db.latestVendorSubscriptionForVendor.mockResolvedValue(subscription);
  db.recordVendorSubscriptionPlanChange.mockResolvedValue(true);
  db.recordVendorSubscriptionCancellationRequest.mockResolvedValue(true);
  audit.auditarAcaoDoFornecedor.mockResolvedValue(undefined);
  audit.auditarAssinaturaDoFornecedorNoCliente.mockResolvedValue(undefined);
  billing.listSubscriptionPayments.mockResolvedValue([]);
  billing.updateSubscription.mockResolvedValue({ status: "ACTIVE" });
  billing.cancelSubscription.mockResolvedValue({ status: "CANCELED" });
});

describe("vendor billing service", () => {
  it("degrada somente o histórico quando o provedor falha", async () => {
    billing.listSubscriptionPayments.mockRejectedValue(new Error("timeout"));
    const result = await service.loadVendorBilling(deps, actor, vendor.id);
    expect(result.payments).toEqual([]);
    expect(result.paymentsAvailable).toBe(false);
    expect(result.subscription).not.toHaveProperty("asaasSubscriptionId");
  });

  it("troca o plano no provedor e registra o estado pendente", async () => {
    db.latestVendorSubscriptionForVendor
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({ ...subscription, pendingPlan: "agency" });
    const result = await service.changeVendorSubscriptionPlan(deps, actor, {
      vendorId: vendor.id,
      subscriptionId: subscription.id,
      plan: "agency",
    });
    expect(billing.updateSubscription).toHaveBeenCalledWith({
      subscriptionId: "sub_asaas_secret",
      plan: "agency",
      amountCents: 59900,
    });
    expect(db.recordVendorSubscriptionPlanChange).toHaveBeenCalledOnce();
    expect(result.pendingPlan).toBe("agency");
  });

  it("cancela no provedor somente depois de registrar auditoria", async () => {
    const order: string[] = [];
    audit.auditarAssinaturaDoFornecedorNoCliente.mockImplementation(async () => { order.push("audit"); });
    billing.cancelSubscription.mockImplementation(async () => { order.push("provider"); return { status: "CANCELED" }; });
    db.latestVendorSubscriptionForVendor
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({ ...subscription, cancelRequestedAt: new Date() });
    await service.cancelVendorSubscription(deps, actor, {
      vendorId: vendor.id,
      subscriptionId: subscription.id,
    });
    expect(order).toEqual(["audit", "provider"]);
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });
});
