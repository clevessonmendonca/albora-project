import { describe, expect, it } from "vitest";
import { stubBillingProvider } from "./provider";

/** Só o stub — `asaasProviderFromConfig` nunca é chamado em teste (NUNCA chamada real paga). */
describe("stubBillingProvider — createSubscription", () => {
  it("devolve um id de assinatura fake, nunca chama rede", async () => {
    const provider = stubBillingProvider();
    const result = await provider.createSubscription({
      vendorId: "11111111-1111-1111-1111-111111111111",
      accountId: "22222222-2222-2222-2222-222222222222",
      email: "fornecedor@example.com",
      plan: "studio",
      amountCents: 24900,
      billingType: "PIX",
      customerId: "cus_stub_11111111",
    });

    expect(result.providerSubscriptionId).toMatch(/^sub_stub_/);
    expect(result.status).toBe("PENDING");
  });
});
