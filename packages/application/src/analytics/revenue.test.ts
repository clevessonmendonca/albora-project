import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { getPlatformRevenue, VENDOR_PLAN_PRICE_CENTS } from "./revenue";
import { prepararBanco } from "@albora/db/testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
  await agregador?.end();
});

function actor(roles: string[] = ["owner"]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

async function criarFornecedorComAssinatura(status: string, plan: "starter" | "studio" | "agency") {
  const { rows: v } = await admin.query("INSERT INTO vendors (name, plan) VALUES ('Fornecedor', $1) RETURNING id", [plan]);
  const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `fornecedor-${Math.random()}@exemplo.test`,
  ]);
  await admin.query(
    `INSERT INTO vendor_subscriptions (vendor_id, account_id, asaas_subscription_id, status, plan)
     VALUES ($1, $2, $3, $4, $5)`,
    [v[0]!.id, acc[0]!.id, `sub-${Math.random()}`, status, plan],
  );
}

describe("getPlatformRevenue", () => {
  it("nega quem não tem analytics.platform.read", async () => {
    await expect(
      getPlatformRevenue({ pool: app, aggregatorPool: agregador }, { actor: actor(["compliance"] as never), reason: "abrir /console" }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("MRR soma só o preço das assinaturas ativas", async () => {
    await prepararBanco();
    await criarFornecedorComAssinatura("active", "starter");
    await criarFornecedorComAssinatura("active", "starter");
    await criarFornecedorComAssinatura("overdue", "studio");

    const revenue = await getPlatformRevenue({ pool: app, aggregatorPool: agregador }, { actor: actor(), reason: "abrir /console" });

    expect(revenue.mrrCents).toBe(2 * VENDOR_PLAN_PRICE_CENTS.starter);
    expect(revenue.overdueCount).toBe(1);
  });

  it("churn 30d carrega o marcador de aproximação até a resposta — ruling do controlador, não só comentário", async () => {
    await prepararBanco();
    await criarFornecedorComAssinatura("canceled", "starter");

    const revenue = await getPlatformRevenue({ pool: app, aggregatorPool: agregador }, { actor: actor(), reason: "abrir /console" });

    expect(revenue.churned30d.value).toBe(1);
    expect(revenue.churned30d.approximate).toBe(true);
    expect(revenue.churned30d.approximationBasis.length).toBeGreaterThan(0);
  });
});
