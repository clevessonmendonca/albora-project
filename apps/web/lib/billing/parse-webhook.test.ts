import { describe, expect, it } from "vitest";
import { parseWebhook } from "./parse-webhook";

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
