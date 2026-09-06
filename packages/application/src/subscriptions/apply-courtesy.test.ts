import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { applySubscriptionCourtesy } from "./apply-courtesy";

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
  return { updateSubscription: vi.fn().mockResolvedValue({ status: "ACTIVE" }) };
}

async function vendorComAssinatura() {
  const { rows: v } = await admin.query("INSERT INTO vendors (name, plan) VALUES ('Estúdio Cortesia', 'studio') RETURNING id");
  const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ('estudio-cortesia@exemplo.test') RETURNING id");
  const { rows: sub } = await admin.query(
    `INSERT INTO vendor_subscriptions (vendor_id, account_id, asaas_subscription_id, status, plan)
     VALUES ($1, $2, 'sub-asaas-cortesia', 'active', 'studio') RETURNING id`,
    [v[0]!.id, acc[0]!.id],
  );
  return sub[0]!.id as string;
}

describe("applySubscriptionCourtesy", () => {
  it("nega quem não tem subscription.mutate — e o provider não é chamado", async () => {
    await prepararBanco();
    const subscriptionId = await vendorComAssinatura();
    const billing = billingMock();

    await expect(
      applySubscriptionCourtesy(
        { pool: app, billing },
        { actor: actor(["support"]), reason: "cortesia por incidente", subscriptionId, discountPercent: 100 },
      ),
    ).rejects.toThrow(CommandDeniedError);
    expect(billing.updateSubscription).not.toHaveBeenCalled();
  });

  it("dono aplica cortesia — chama o provider com o id do Asaas e o desconto", async () => {
    await prepararBanco();
    const subscriptionId = await vendorComAssinatura();
    const billing = billingMock();

    const resultado = await applySubscriptionCourtesy(
      { pool: app, billing },
      { actor: actor(["owner"]), reason: "cortesia por incidente", subscriptionId, discountPercent: 100 },
    );

    expect(resultado.status).toBe("ACTIVE");
    expect(billing.updateSubscription).toHaveBeenCalledWith({
      subscriptionId: "sub-asaas-cortesia",
      discountPercent: 100,
    });
  });

  it("grava exatamente uma linha em audit_log com target_kind 'subscription'", async () => {
    await prepararBanco();
    const subscriptionId = await vendorComAssinatura();
    const billing = billingMock();

    await applySubscriptionCourtesy(
      { pool: app, billing },
      { actor: actor(["owner"]), reason: "cortesia por incidente", subscriptionId, discountPercent: 100 },
    );

    const { rows } = await admin.query<{ metadata: Record<string, unknown>; target_kind: string; target_id: string }>(
      "SELECT metadata, target_kind, target_id FROM audit_log WHERE action = 'subscription.courtesy'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.target_kind).toBe("subscription");
    expect(rows[0]?.target_id).toBe(subscriptionId);
    expect(JSON.stringify(rows[0]?.metadata ?? {})).not.toMatch(/token|asaas|cus_|sub-asaas/i);
  });

  it("falha do provider não deixa audit_log dizendo que a cortesia aconteceu", async () => {
    await prepararBanco();
    const subscriptionId = await vendorComAssinatura();
    const billing = { updateSubscription: vi.fn().mockRejectedValue(new Error("asaas.subscription.update: 500")) };

    await expect(
      applySubscriptionCourtesy(
        { pool: app, billing },
        { actor: actor(["owner"]), reason: "cortesia por incidente", subscriptionId, discountPercent: 100 },
      ),
    ).rejects.toThrow("asaas.subscription.update");

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'subscription.courtesy'",
    );
    expect(rows[0]?.n).toBe("0");
  });
});
