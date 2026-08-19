import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ativarPlanoDoFornecedor,
  createVendorSubscription,
  markVendorSubscriptionByAsaasId,
} from "./billing";
import { prepararBanco, semear } from "./testes/banco";

/**
 * Assinatura do fornecedor (Modelo A). Nenhuma chamada de rede: o SDK do
 * Asaas vive em `apps/web/lib/billing` (fora de `packages/db`), atrás da
 * interface `BillingProvider` — o que se testa aqui é só a plumbing de
 * banco que o webhook chama depois de o provedor confirmar por fora.
 */

let admin: pg.Pool;
let app: pg.Pool;
let agregador: pg.Pool;
let vendorId: string;
let accountId: string;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  agregador = pools.agregador;
  await semear(admin);

  const { rows: acc } = await admin.query<{ id: string }>(
    "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
    ["fornecedor-billing@exemplo.test"],
  );
  accountId = acc[0]!.id;

  const { rows: v } = await admin.query<{ id: string }>(
    "INSERT INTO vendors (name) VALUES ($1) RETURNING id",
    ["Cerimonial Billing"],
  );
  vendorId = v[0]!.id;
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end(), agregador?.end()]);
});

describe("createVendorSubscription", () => {
  it("nasce pending, mapeando asaas_subscription_id → vendor_id", async () => {
    const sub = await createVendorSubscription(app, {
      vendorId,
      accountId,
      asaasSubscriptionId: "sub_fake_001",
      plan: "studio",
    });

    expect(sub.status).toBe("pending");
    expect(sub.vendorId).toBe(vendorId);
    expect(sub.plan).toBe("studio");
  });

  it("asaas_subscription_id é único — segunda tentativa com o mesmo id estoura", async () => {
    await expect(
      createVendorSubscription(app, {
        vendorId,
        accountId,
        asaasSubscriptionId: "sub_fake_001",
        plan: "agency",
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });
});

describe("markVendorSubscriptionByAsaasId — idempotência do webhook", () => {
  it("marca active e devolve o vendor por trás do id do Asaas", async () => {
    const marcado = await markVendorSubscriptionByAsaasId(app, "sub_fake_001", "active");
    expect(marcado).toEqual({ vendorId, accountId, plan: "studio" });
  });

  it("id desconhecido devolve null — evento de webhook duplicado/alheio não quebra", async () => {
    expect(await markVendorSubscriptionByAsaasId(app, "sub_que_nao_existe", "active")).toBeNull();
  });
});

describe("ativarPlanoDoFornecedor — única escrita de vendors.status/plan pago", () => {
  it("ativa o vendor certo, auditando o motivo com o vendorId fechado", async () => {
    const registros: { motivo: string; em: Date }[] = [];

    await ativarPlanoDoFornecedor(agregador, vendorId, "studio", (r) => registros.push(r));

    const { rows } = await admin.query<{ status: string; plan: string }>(
      "SELECT status, plan FROM vendors WHERE id = $1",
      [vendorId],
    );
    expect(rows[0]).toEqual({ status: "active", plan: "studio" });
    expect(registros).toHaveLength(1);
    expect(registros[0]?.motivo).toBe(`billing_webhook:vendor:${vendorId}`);
  });
});
