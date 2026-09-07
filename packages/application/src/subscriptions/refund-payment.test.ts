import { describe, expect, it, vi } from "vitest";
import type pg from "pg";
import { afterAll, beforeAll } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { ApprovalRequiredError } from "../envelope/errors";
import { refundPayment } from "./refund-payment";

let app: pg.Pool;
let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

function actor(roles: string[]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "s",
    requestId: "r",
    reauthenticatedAt: null,
  };
}

function billingMock() {
  return { refundPayment: vi.fn().mockResolvedValue({ status: "REFUNDED" }) };
}

describe("refundPayment", () => {
  it("financeiro reembolsa valor abaixo do limiar", async () => {
    const billing = billingMock();
    const resultado = await refundPayment(
      { pool: app, billing },
      {
        actor: actor(["finance"]),
        reason: "cliente pediu reembolso",
        paymentId: "pay-1",
        asaasPaymentId: "pay-stub-1",
        amountCents: 10_000,
      },
    );
    expect(resultado.status).toBe("REFUNDED");
    expect(billing.refundPayment).toHaveBeenCalledWith({ paymentId: "pay-stub-1", amountCents: 10_000 });
  });

  // `ApprovalRequiredError`, não `CommandDeniedError`: a decisão carrega QUEM
  // pode aprovar (`subscription.refund.approve`), então a tela diz "esse valor
  // exige o dono" em vez de "você não pode". Negação seca perde a informação
  // que resolve o problema do operador.
  it("financeiro acima do limiar recebe exigência de aprovação, não negação seca", async () => {
    const billing = billingMock();
    await expect(
      refundPayment(
        { pool: app, billing },
        {
          actor: actor(["finance"]),
          reason: "reembolso grande",
          paymentId: "pay-2",
          asaasPaymentId: "pay-stub-2",
          amountCents: 60_000,
        },
      ),
    ).rejects.toThrow(ApprovalRequiredError);
    expect(billing.refundPayment).not.toHaveBeenCalled();
  });

  it("dono executa valor acima do limiar — sem fila, execução direta", async () => {
    const billing = billingMock();
    const resultado = await refundPayment(
      { pool: app, billing },
      {
        actor: actor(["owner"]),
        reason: "reembolso grande aprovado",
        paymentId: "pay-3",
        asaasPaymentId: "pay-stub-3",
        amountCents: 60_000,
      },
    );
    expect(resultado.status).toBe("REFUNDED");
  });
});
