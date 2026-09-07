import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { requestImpersonation } from "./request-impersonation";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

function actor(staffUserId: string, roles: string[]) {
  return { staffUserId, roles: roles as never, sessionId: "s", requestId: "r", reauthenticatedAt: null };
}

async function staffFixo(nome: string): Promise<string> {
  const id = randomUUID();
  await admin.query("INSERT INTO staff_users (id, email, name) VALUES ($1, $2, $3)", [
    id,
    `${nome}-${id.slice(0, 8)}@albora.com`,
    nome,
  ]);
  return id;
}

async function contaFixture(): Promise<string> {
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${Math.random().toString(36).slice(2)}@exemplo.test`,
  ]);
  return rows[0].id as string;
}

describe("requestImpersonation", () => {
  it("support cria pedido com sucesso — prova o RULING: impersonate.request não é mais bloqueado por política", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const contaId = await contaFixture();

    const pedido = await requestImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "ticket p0 — cliente não vê upload", targetAccountId: contaId },
    );

    expect(pedido.status).toBe("pending");
    expect(pedido.requesterStaffId).toBe(supportId);
    expect(pedido.targetAccountId).toBe(contaId);
  });

  it("engineering (sem impersonate.request) é negado e nada é criado", async () => {
    await prepararBanco();
    const engId = await staffFixo("Engenheiro");
    const contaId = await contaFixture();

    await expect(
      requestImpersonation({ pool: app }, { actor: actor(engId, ["engineering"]), reason: "curioso", targetAccountId: contaId }),
    ).rejects.toThrow();

    const { rows } = await admin.query("SELECT 1 FROM impersonation_requests WHERE requester_staff_id = $1", [engId]);
    expect(rows).toHaveLength(0);
  });

  it("grava exatamente uma linha em audit_log com target_kind='impersonation_request' e o id do pedido criado", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const contaId = await contaFixture();

    const pedido = await requestImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "ticket 42", targetAccountId: contaId },
    );

    const { rows } = await admin.query(
      "SELECT * FROM audit_log WHERE action = 'impersonate.request' AND target_kind = 'impersonation_request' AND target_id = $1",
      [pedido.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe("ticket 42");
  });

  it("metadata da auditoria não contém PII — só o id da conta-alvo", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const { rows: contaRows } = await admin.query(
      "INSERT INTO accounts (email) VALUES ('maria.titular@exemplo.test') RETURNING id",
    );
    const contaId = contaRows[0].id as string;

    await requestImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "pedido de maria por telefone — protocolo #7", targetAccountId: contaId },
    );

    const { rows } = await admin.query<{ metadata: Record<string, unknown> }>(
      "SELECT metadata FROM audit_log WHERE action = 'impersonate.request' ORDER BY at DESC LIMIT 1",
    );
    const metadataStr = JSON.stringify(rows[0]?.metadata ?? {});
    expect(metadataStr).not.toContain("maria.titular@exemplo.test");
    expect(metadataStr).not.toContain("maria");
    expect(metadataStr).not.toContain("pedido de maria");
    expect(rows[0]?.metadata).toEqual({ targetAccountId: contaId });
  });
});
