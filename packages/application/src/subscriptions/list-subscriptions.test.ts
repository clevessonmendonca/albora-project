import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { listSubscriptions, OVERDUE_DAYS_BASIS } from "./list-subscriptions";

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

function actor(roles: string[]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

describe("listSubscriptions", () => {
  it("nega quem não tem subscription.read, e a query não roda", async () => {
    await expect(
      listSubscriptions(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["engineering"]), reason: "abrir /console/subscriptions", limit: 20 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("carrega a base da aproximação do atraso até a linha, não só até o comentário da query", async () => {
    await prepararBanco();
    const { rows: v } = await admin.query("INSERT INTO vendors (name, plan) VALUES ('Estúdio Y', 'studio') RETURNING id");
    const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ('estudio-y@exemplo.test') RETURNING id");
    await admin.query(
      `INSERT INTO vendor_subscriptions (vendor_id, account_id, asaas_subscription_id, status, plan, updated_at)
       VALUES ($1, $2, 'sub-y', 'overdue', 'studio', now() - interval '2 days')`,
      [v[0]!.id, acc[0]!.id],
    );

    const { rows } = await listSubscriptions(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "abrir /console/subscriptions", limit: 20 },
    );

    const linha = rows.find((r) => r.vendorId === v[0]!.id);
    expect(linha?.overdueDays?.approximate).toBe(true);
    expect(linha?.overdueDays?.approximationBasis).toBe(OVERDUE_DAYS_BASIS);
    expect(linha?.nextChargeAt).toBeNull();
  });
});
