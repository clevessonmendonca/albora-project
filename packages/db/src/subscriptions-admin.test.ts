import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listVendorSubscriptionsAdmin } from "./subscriptions-admin";
import { prepararBanco } from "./testes/banco";

let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await agregador?.end();
});

async function vendorComAssinatura(
  status: "pending" | "active" | "overdue" | "canceled",
  updatedAtIntervalo: string,
) {
  const sufixo = `${status}-${Math.random().toString(36).slice(2)}`;
  const { rows: v } = await admin.query("INSERT INTO vendors (name, plan) VALUES ($1, 'studio') RETURNING id", [
    `Estúdio ${sufixo}`,
  ]);
  const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `${sufixo}@exemplo.test`,
  ]);
  await admin.query(
    `INSERT INTO vendor_subscriptions (vendor_id, account_id, asaas_subscription_id, status, plan, updated_at)
     VALUES ($1, $2, $3, $4, 'studio', now() - interval '${updatedAtIntervalo}')`,
    [v[0]!.id, acc[0]!.id, `sub-${sufixo}`, status],
  );
  return v[0]!.id as string;
}

describe("listVendorSubscriptionsAdmin", () => {
  it("atraso é aproximado por now() - updated_at quando overdue, null quando não", async () => {
    const overdueId = await vendorComAssinatura("overdue", "3 days");
    const activeId = await vendorComAssinatura("active", "10 days");

    const { rows } = await listVendorSubscriptionsAdmin(agregador, { limit: 50 });

    const emAtraso = rows.find((r) => r.vendorId === overdueId);
    expect(emAtraso?.status).toBe("overdue");
    expect(emAtraso?.overdueDays).toBeGreaterThanOrEqual(2);
    expect(emAtraso?.nextChargeAt).toBeNull();

    const ativa = rows.find((r) => r.vendorId === activeId);
    expect(ativa?.status).toBe("active");
    expect(ativa?.overdueDays).toBeNull();
  });

  it("próxima cobrança é sempre null — não existe coluna de vencimento no banco local", async () => {
    const vendorId = await vendorComAssinatura("active", "1 day");
    const { rows } = await listVendorSubscriptionsAdmin(agregador, { limit: 50 });
    const linha = rows.find((r) => r.vendorId === vendorId);
    expect(linha?.nextChargeAt).toBeNull();
  });

  it("filtra por status no WHERE, não em memória depois do LIMIT", async () => {
    const overdueId = await vendorComAssinatura("overdue", "1 day");
    const canceledId = await vendorComAssinatura("canceled", "1 day");

    const { rows } = await listVendorSubscriptionsAdmin(agregador, { status: "overdue", limit: 50 });

    expect(rows.some((r) => r.vendorId === overdueId)).toBe(true);
    expect(rows.some((r) => r.vendorId === canceledId)).toBe(false);
  });

  it("expõe subscriptionId e asaasSubscriptionId, não só o vendorId", async () => {
    const vendorId = await vendorComAssinatura("active", "1 day");
    const { rows } = await listVendorSubscriptionsAdmin(agregador, { limit: 50 });
    const linha = rows.find((r) => r.vendorId === vendorId);
    expect(linha?.subscriptionId).toBeTruthy();
    expect(linha?.asaasSubscriptionId).toMatch(/^sub-/);
  });
});
