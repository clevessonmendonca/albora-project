import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const ACCOUNT_ID = "22222222-2222-2222-2222-222222222222";

/**
 * Dinheiro mockado no boundary — `resolveBilling`/`createVendorSubscription`
 * nunca chamam rede real aqui. O que este arquivo prova é o portão do
 * servidor: uma assinatura `pending`/`active` já existente barra a rota antes
 * de qualquer chamada ao provedor, mesmo que a UI (que já escondia o botão)
 * seja ignorada por uma chamada direta à API.
 */

const { requireConfig, requireHostSession } = vi.hoisted(() => ({
  requireConfig: vi.fn(() => null),
  requireHostSession: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireConfig, requireHostSession };
});

const { roleForAccountOnVendor, createVendorSubscription, asaasCustomerIdForAccount, upsertBillingCustomer } =
  vi.hoisted(() => ({
    roleForAccountOnVendor: vi.fn(),
    createVendorSubscription: vi.fn(),
    asaasCustomerIdForAccount: vi.fn(),
    upsertBillingCustomer: vi.fn(),
  }));

vi.mock("@albora/db", () => ({
  roleForAccountOnVendor,
  createVendorSubscription,
  asaasCustomerIdForAccount,
  upsertBillingCustomer,
}));

const { poolQuery } = vi.hoisted(() => ({ poolQuery: vi.fn() }));

vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: poolQuery }),
}));

const { resolveBilling, providerCreateSubscription, providerEnsureCustomer } = vi.hoisted(() => ({
  resolveBilling: vi.fn(),
  providerCreateSubscription: vi.fn(),
  providerEnsureCustomer: vi.fn(),
}));

vi.mock("@/lib/billing", () => ({
  resolveBilling,
  VENDOR_PLAN_PRICE_CENTS: { starter: 9900, studio: 19900, agency: 39900 },
}));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));

vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { POST } = await import("./route");

function req(body: unknown = { plan: "starter" }) {
  return new Request(`https://exemplo.test/api/vendors/${VENDOR_ID}/subscription`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params() {
  return { params: Promise.resolve({ vendorId: VENDOR_ID }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireHostSession.mockResolvedValue({
    host: { accountId: ACCOUNT_ID, email: "admin@exemplo.test" },
  });
  roleForAccountOnVendor.mockResolvedValue("admin");
  consume.mockReturnValue({ allowed: true, remaining: 4, resetInSeconds: 60 });
  resolveBilling.mockReturnValue({
    mode: "stub",
    provider: {
      ensureCustomer: providerEnsureCustomer,
      createSubscription: providerCreateSubscription,
    },
  });
  asaasCustomerIdForAccount.mockResolvedValue("cus_existente");
  providerCreateSubscription.mockResolvedValue({
    providerSubscriptionId: "sub_stub_1",
    invoiceUrl: null,
    status: "PENDING",
  });
  createVendorSubscription.mockResolvedValue({
    id: "sub-db-1",
    vendorId: VENDOR_ID,
    accountId: ACCOUNT_ID,
    asaasSubscriptionId: "sub_stub_1",
    status: "pending",
    plan: "starter",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

describe("POST /api/vendors/[vendorId]/subscription", () => {
  it("já há pending/active: 409, sem tocar o provedor nem gravar de novo", async () => {
    poolQuery.mockResolvedValue({ rows: [{ blocked: true }] });

    const res = await POST(req(), params());

    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("vendor.assinatura_ja_existe");
    expect(providerCreateSubscription).not.toHaveBeenCalled();
    expect(createVendorSubscription).not.toHaveBeenCalled();
  });

  it("sem assinatura pending/active: cria normalmente", async () => {
    poolQuery.mockResolvedValue({ rows: [{ blocked: false }] });

    const res = await POST(req(), params());

    expect(res.status).toBe(200);
    expect(providerCreateSubscription).toHaveBeenCalledTimes(1);
    expect(createVendorSubscription).toHaveBeenCalledTimes(1);
  });

  it("checagem roda depois do gate de papel — staff nunca chega na query de assinatura", async () => {
    roleForAccountOnVendor.mockResolvedValue("staff");
    poolQuery.mockResolvedValue({ rows: [{ blocked: false }] });

    const res = await POST(req(), params());

    expect(res.status).toBe(403);
    expect(poolQuery).not.toHaveBeenCalled();
    expect(providerCreateSubscription).not.toHaveBeenCalled();
  });

  it("checagem roda antes de qualquer chamada ao provedor mesmo sem bloqueio prévio", async () => {
    const ordem: string[] = [];
    poolQuery.mockImplementation(async () => {
      ordem.push("select_existente");
      return { rows: [{ blocked: false }] };
    });
    providerCreateSubscription.mockImplementation(async () => {
      ordem.push("provedor_cria");
      return { providerSubscriptionId: "sub_stub_1", invoiceUrl: null, status: "PENDING" };
    });

    await POST(req(), params());

    expect(ordem).toEqual(["select_existente", "provedor_cria"]);
  });

  it("duas chamadas em sequência — a segunda vê o que a primeira gravou e é barrada", async () => {
    let jaExiste = false;
    poolQuery.mockImplementation(async () => ({ rows: [{ blocked: jaExiste }] }));
    createVendorSubscription.mockImplementation(async (..._args: unknown[]) => {
      jaExiste = true;
      return {
        id: "sub-db-1",
        vendorId: VENDOR_ID,
        accountId: ACCOUNT_ID,
        asaasSubscriptionId: "sub_stub_1",
        status: "pending",
        plan: "starter",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    const primeira = await POST(req(), params());
    const segunda = await POST(req(), params());

    expect(primeira.status).toBe(200);
    expect(segunda.status).toBe(409);
    expect(createVendorSubscription).toHaveBeenCalledTimes(1);
  });
});
