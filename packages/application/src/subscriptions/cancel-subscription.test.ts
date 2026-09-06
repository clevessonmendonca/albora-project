import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { cancelSubscription } from "./cancel-subscription";

let admin: pg.Pool;
let app: pg.Pool;

const STAFF_ID_FIXO = "11111111-1111-1111-1111-111111111111";

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

function actor(roles: string[]) {
  return { staffUserId: STAFF_ID_FIXO, roles: roles as never, sessionId: "s", requestId: "r", reauthenticatedAt: null };
}

function billingMock() {
  return { cancelSubscription: vi.fn().mockResolvedValue({ status: "CANCELED" }) };
}

async function vendorComAssinatura() {
  const { rows: v } = await admin.query("INSERT INTO vendors (name, plan) VALUES ('Estúdio Cancela', 'agency') RETURNING id");
  const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ('estudio-cancela@exemplo.test') RETURNING id");
  const { rows: sub } = await admin.query(
    `INSERT INTO vendor_subscriptions (vendor_id, account_id, asaas_subscription_id, status, plan)
     VALUES ($1, $2, 'sub-asaas-cancela', 'active', 'agency') RETURNING id`,
    [v[0]!.id, acc[0]!.id],
  );
  return sub[0]!.id as string;
}

describe("cancelSubscription", () => {
  it("nega quem não tem subscription.mutate — e o provider não é chamado", async () => {
    await prepararBanco();
    const subscriptionId = await vendorComAssinatura();
    const billing = billingMock();

    await expect(
      cancelSubscription(
        { pool: app, billing },
        { actor: actor(["support"]), reason: "cliente pediu cancelamento", subscriptionId },
      ),
    ).rejects.toThrow(CommandDeniedError);
    expect(billing.cancelSubscription).not.toHaveBeenCalled();
  });

  it("financeiro cancela — chama o provider com o id do Asaas, nunca escreve vendor_subscriptions direto", async () => {
    await prepararBanco();
    const subscriptionId = await vendorComAssinatura();
    const billing = billingMock();

    const resultado = await cancelSubscription(
      { pool: app, billing },
      { actor: actor(["finance"]), reason: "cliente pediu cancelamento", subscriptionId },
    );

    expect(resultado.status).toBe("CANCELED");
    expect(billing.cancelSubscription).toHaveBeenCalledWith({ subscriptionId: "sub-asaas-cancela" });

    const { rows } = await admin.query<{ status: string }>(
      "SELECT status FROM vendor_subscriptions WHERE id = $1",
      [subscriptionId],
    );
    expect(rows[0]?.status).toBe("active");
  });

  it("grava exatamente uma linha em audit_log com target_kind 'subscription'", async () => {
    await prepararBanco();
    const subscriptionId = await vendorComAssinatura();
    const billing = billingMock();

    await cancelSubscription(
      { pool: app, billing },
      { actor: actor(["finance"]), reason: "cliente pediu cancelamento", subscriptionId },
    );

    const { rows } = await admin.query<{ target_kind: string; target_id: string }>(
      "SELECT target_kind, target_id FROM audit_log WHERE action = 'subscription.cancel'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.target_kind).toBe("subscription");
    expect(rows[0]?.target_id).toBe(subscriptionId);
  });

  it("falha do provider não deixa audit_log dizendo que o cancelamento aconteceu", async () => {
    await prepararBanco();
    const subscriptionId = await vendorComAssinatura();
    const billing = { cancelSubscription: vi.fn().mockRejectedValue(new Error("asaas.subscription.cancel: 500")) };

    await expect(
      cancelSubscription(
        { pool: app, billing },
        { actor: actor(["finance"]), reason: "cliente pediu cancelamento", subscriptionId },
      ),
    ).rejects.toThrow("asaas.subscription.cancel");

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'subscription.cancel'",
    );
    expect(rows[0]?.n).toBe("0");
  });
});
