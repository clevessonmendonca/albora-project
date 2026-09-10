import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ativarPlanoDoFornecedor,
  createVendorSubscription,
  listBillingPaymentsForAccountAdmin,
  listRefundablePaymentsForVendor,
  latestVendorSubscriptionForVendor,
  markVendorSubscriptionByAsaasId,
  recordVendorSubscriptionCancellationRequest,
  recordVendorSubscriptionPlanChange,
} from "./billing";
import { prepararBanco, semear } from "./testes/banco";

/** Assinatura do fornecedor: SDK Asaas fica em `apps/web/lib/billing` atrás de `BillingProvider` — testa só a plumbing de banco que o webhook chama. */

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

describe("autosserviço da assinatura", () => {
  it("mantém a troca pendente até o webhook efetivar o novo plano", async () => {
    const current = await latestVendorSubscriptionForVendor(app, vendorId);
    expect(current).not.toBeNull();
    const client = await app.connect();
    try {
      expect(await recordVendorSubscriptionPlanChange(client, current!.id, vendorId, "agency")).toBe(true);
    } finally {
      client.release();
    }
    expect((await latestVendorSubscriptionForVendor(app, vendorId))?.pendingPlan).toBe("agency");
    expect(await markVendorSubscriptionByAsaasId(app, "sub_fake_001", "active")).toEqual({
      vendorId,
      accountId,
      plan: "agency",
    });
    const updated = await latestVendorSubscriptionForVendor(app, vendorId);
    expect(updated?.plan).toBe("agency");
    expect(updated?.pendingPlan).toBeNull();
  });

  it("registra cancelamento uma vez e rejeita repetição", async () => {
    const current = await latestVendorSubscriptionForVendor(app, vendorId);
    const client = await app.connect();
    try {
      expect(await recordVendorSubscriptionCancellationRequest(client, current!.id, vendorId)).toBe(true);
      expect(await recordVendorSubscriptionCancellationRequest(client, current!.id, vendorId)).toBe(false);
    } finally {
      client.release();
    }
    expect((await latestVendorSubscriptionForVendor(app, vendorId))?.cancelRequestedAt).toBeInstanceOf(Date);
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

describe("listBillingPaymentsForAccountAdmin", () => {
  it("lista pagamentos da conta, mais recente primeiro", async () => {
    await prepararBanco();
    const { rows: acc } = await admin.query<{ id: string }>(
      "INSERT INTO accounts (email) VALUES ('pagador@exemplo.test') RETURNING id",
    );
    await admin.query("INSERT INTO packs (id) VALUES ('pack-pgto')");
    const { rows: evento } = await admin.query<{ id: string }>(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
       VALUES ($1, 'pack-pgto', 'evento-pgto', now(), now() + interval '6 hours', 'active') RETURNING id`,
      [acc[0]!.id],
    );
    await admin.query(
      `INSERT INTO billing_payments (account_id, event_id, asaas_payment_id, status, plan, amount_cents)
       VALUES ($1, $2, 'pay-1', 'confirmed', 'celebration', 19900)`,
      [acc[0]!.id, evento[0]!.id],
    );

    const pagamentos = await listBillingPaymentsForAccountAdmin(agregador, acc[0]!.id);
    expect(pagamentos).toHaveLength(1);
    expect(pagamentos[0]?.amountCents).toBe(19900);
  });
});

describe("listRefundablePaymentsForVendor", () => {
  /**
   * Vínculo é `billing_payments.event_id → events.vendor_id`, nunca
   * `vendor_members` — cada evento aqui já nasce com `vendor_id` apontando
   * pro fornecedor de teste, e o pagamento pendura no evento, não na conta.
   */
  async function pagamentoDoFornecedor(
    vendorIdDoTeste: string,
    status: "pending" | "confirmed" | "received" | "refunded" | "overdue" | "deleted",
    opcoes: { semVendor?: boolean } = {},
  ) {
    const sufixo = `${status}-${Math.random().toString(36).slice(2)}`;
    const { rows: acc } = await admin.query<{ id: string }>(
      "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
      [`pagador-${sufixo}@exemplo.test`],
    );
    await admin.query("INSERT INTO packs (id) VALUES ($1)", [`pack-${sufixo}`]);
    const { rows: evento } = await admin.query<{ id: string }>(
      `INSERT INTO events (account_id, vendor_id, pack_id, slug, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, now(), now() + interval '6 hours') RETURNING id`,
      [acc[0]!.id, opcoes.semVendor ? null : vendorIdDoTeste, `pack-${sufixo}`, `evento-${sufixo}`],
    );
    const { rows: pagamento } = await admin.query<{ id: string }>(
      `INSERT INTO billing_payments (account_id, event_id, asaas_payment_id, status, plan, amount_cents)
       VALUES ($1, $2, $3, $4, 'vendor', 50000) RETURNING id`,
      [acc[0]!.id, evento[0]!.id, `pay-${sufixo}`, status],
    );
    return pagamento[0]!.id as string;
  }

  it("lista só confirmed/received do fornecedor — nunca refunded/deleted/pending/overdue", async () => {
    const { rows: v } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ('Cerimonial Reembolso') RETURNING id",
    );
    const vendorId = v[0]!.id;

    const confirmedId = await pagamentoDoFornecedor(vendorId, "confirmed");
    const receivedId = await pagamentoDoFornecedor(vendorId, "received");
    const refundedId = await pagamentoDoFornecedor(vendorId, "refunded");
    const deletedId = await pagamentoDoFornecedor(vendorId, "deleted");
    const pendingId = await pagamentoDoFornecedor(vendorId, "pending");
    const overdueId = await pagamentoDoFornecedor(vendorId, "overdue");

    const linhas = await listRefundablePaymentsForVendor(agregador, vendorId);
    const ids = linhas.map((l) => l.id);

    expect(ids).toContain(confirmedId);
    expect(ids).toContain(receivedId);
    expect(ids).not.toContain(refundedId);
    expect(ids).not.toContain(deletedId);
    expect(ids).not.toContain(pendingId);
    expect(ids).not.toContain(overdueId);
  });

  it("nunca mistura pagamento de outro fornecedor", async () => {
    const { rows: v1 } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ('Fornecedor A') RETURNING id",
    );
    const { rows: v2 } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ('Fornecedor B') RETURNING id",
    );

    const doA = await pagamentoDoFornecedor(v1[0]!.id, "confirmed");
    const doB = await pagamentoDoFornecedor(v2[0]!.id, "confirmed");

    const linhas = await listRefundablePaymentsForVendor(agregador, v1[0]!.id);
    const ids = linhas.map((l) => l.id);

    expect(ids).toContain(doA);
    expect(ids).not.toContain(doB);
  });

  it("evento sem vendor_id nunca aparece pra fornecedor nenhum", async () => {
    const { rows: v } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ('Fornecedor C') RETURNING id",
    );
    const semVendorId = await pagamentoDoFornecedor(v[0]!.id, "confirmed", { semVendor: true });

    const linhas = await listRefundablePaymentsForVendor(agregador, v[0]!.id);
    expect(linhas.map((l) => l.id)).not.toContain(semVendorId);
  });

  it("expõe asaasPaymentId e amountCents, não só o id local", async () => {
    const { rows: v } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ('Fornecedor D') RETURNING id",
    );
    const id = await pagamentoDoFornecedor(v[0]!.id, "confirmed");

    const linhas = await listRefundablePaymentsForVendor(agregador, v[0]!.id);
    const linha = linhas.find((l) => l.id === id);
    expect(linha?.asaasPaymentId).toMatch(/^pay-confirmed-/);
    expect(linha?.amountCents).toBe(50000);
  });
});
