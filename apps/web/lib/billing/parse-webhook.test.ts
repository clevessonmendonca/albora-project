import { describe, expect, it } from "vitest";
import { parseVendorWebhook, parseWebhook } from "./parse-webhook";

const headers = (token?: string) =>
  new Headers(token ? { "asaas-access-token": token } : undefined);

describe("parseWebhook", () => {
  it("rejeita token diferente do esperado", () => {
    const result = parseWebhook(
      headers("errado"),
      {
        id: "evt_1",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_1" },
      },
      "secreto",
    );
    expect(result).toEqual({ error: "token" });
  });

  it("aceita PAYMENT_RECEIVED com token válido", () => {
    const result = parseWebhook(
      headers("secreto"),
      {
        id: "evt_recv",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_abc" },
      },
      "secreto",
    );
    expect(result).toEqual({
      eventId: "evt_recv",
      eventName: "PAYMENT_RECEIVED",
      paymentId: "pay_abc",
      status: "RECEIVED",
    });
  });
});

describe("parseVendorWebhook", () => {
  it("rejeita token diferente do esperado ANTES de olhar o corpo — nem um payload malformado passa", () => {
    const result = parseVendorWebhook(
      headers("errado"),
      { not: "a valid payload at all" },
      "secreto",
    );
    expect(result).toEqual({ error: "token" });
  });

  it("aceita PAYMENT_CONFIRMED com payment.subscription e token válido", () => {
    const result = parseVendorWebhook(
      headers("secreto"),
      {
        id: "evt_sub_1",
        event: "PAYMENT_CONFIRMED",
        payment: { id: "pay_1", subscription: "sub_abc" },
      },
      "secreto",
    );
    expect(result).toEqual({
      eventId: "evt_sub_1",
      eventName: "PAYMENT_CONFIRMED",
      subscriptionId: "sub_abc",
      status: "CONFIRMED",
    });
  });

  it("devolve null para pagamento sem payment.subscription — não é assinatura, é ignorado", () => {
    const result = parseVendorWebhook(
      headers("secreto"),
      {
        id: "evt_pay_1",
        event: "PAYMENT_CONFIRMED",
        payment: { id: "pay_1" },
      },
      "secreto",
    );
    expect(result).toBeNull();
  });

  it("mapeia PAYMENT_OVERDUE e PAYMENT_DELETED", () => {
    const overdue = parseVendorWebhook(
      headers("secreto"),
      { id: "evt_2", event: "PAYMENT_OVERDUE", payment: { subscription: "sub_x" } },
      "secreto",
    );
    expect(overdue).toMatchObject({ status: "OVERDUE", subscriptionId: "sub_x" });

    const deleted = parseVendorWebhook(
      headers("secreto"),
      { id: "evt_3", event: "PAYMENT_DELETED", payment: { subscription: "sub_x" } },
      "secreto",
    );
    expect(deleted).toMatchObject({ status: "DELETED", subscriptionId: "sub_x" });
  });

  it("sem token esperado, aceita sem checar header", () => {
    const result = parseVendorWebhook(
      headers(),
      { id: "evt_4", event: "PAYMENT_RECEIVED", payment: { subscription: "sub_y" } },
      null,
    );
    expect(result).toMatchObject({ status: "RECEIVED", subscriptionId: "sub_y" });
  });
});
