import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { listRefundablePayments } from "./list-refundable-payments";

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

async function fornecedorComPagamentoConfirmado() {
  const sufixo = Math.random().toString(36).slice(2);
  const { rows: v } = await admin.query<{ id: string }>(
    "INSERT INTO vendors (name) VALUES ($1) RETURNING id",
    [`Estúdio ${sufixo}`],
  );
  const { rows: acc } = await admin.query<{ id: string }>(
    "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
    [`pagador-${sufixo}@exemplo.test`],
  );
  await admin.query("INSERT INTO packs (id) VALUES ($1)", [`pack-${sufixo}`]);
  const { rows: evento } = await admin.query<{ id: string }>(
    `INSERT INTO events (account_id, vendor_id, pack_id, slug, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, now(), now() + interval '6 hours') RETURNING id`,
    [acc[0]!.id, v[0]!.id, `pack-${sufixo}`, `evento-${sufixo}`],
  );
  const { rows: pagamento } = await admin.query<{ id: string }>(
    `INSERT INTO billing_payments (account_id, event_id, asaas_payment_id, status, plan, amount_cents)
     VALUES ($1, $2, $3, 'confirmed', 'vendor', 80000) RETURNING id`,
    [acc[0]!.id, evento[0]!.id, `pay-${sufixo}`],
  );
  return { vendorId: v[0]!.id, paymentId: pagamento[0]!.id };
}

describe("listRefundablePayments", () => {
  it("nega quem não tem subscription.read, e a query não roda", async () => {
    await expect(
      listRefundablePayments(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["engineering"]), reason: "abrir diálogo de reembolso", vendorId: "v1" },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("nega compliance (accounts/lgpd/retention/audit/security, nenhuma capacidade de assinatura)", async () => {
    await expect(
      listRefundablePayments(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["compliance"]), reason: "abrir diálogo de reembolso", vendorId: "v1" },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("financeiro (subscription.refund) recebe os pagamentos reembolsáveis do fornecedor", async () => {
    const { vendorId, paymentId } = await fornecedorComPagamentoConfirmado();

    const { rows } = await listRefundablePayments(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["finance"]), reason: "abrir diálogo de reembolso", vendorId },
    );

    expect(rows.map((r) => r.id)).toContain(paymentId);
    expect(rows.find((r) => r.id === paymentId)?.amountCents).toBe(80000);
  });

  it("dono também recebe (subscription.refund + subscription.refund.approve)", async () => {
    const { vendorId, paymentId } = await fornecedorComPagamentoConfirmado();

    const { rows } = await listRefundablePayments(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "abrir diálogo de reembolso", vendorId },
    );

    expect(rows.map((r) => r.id)).toContain(paymentId);
  });
});
