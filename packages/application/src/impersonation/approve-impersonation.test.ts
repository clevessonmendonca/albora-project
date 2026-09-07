import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { approveImpersonation } from "./approve-impersonation";
import { denyImpersonation } from "./deny-impersonation";
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

describe("approveImpersonation", () => {
  it("support NÃO aprova — não tem impersonate.approve, e o pedido continua pending", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const contaId = await contaFixture();
    const pedido = await requestImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "ticket", targetAccountId: contaId },
    );

    await expect(
      approveImpersonation({ pool: app }, { actor: actor(supportId, ["support"]), reason: "aprovado", requestId: pedido.id }),
    ).rejects.toThrow(CommandDeniedError);

    const { rows } = await admin.query("SELECT status FROM impersonation_requests WHERE id = $1", [pedido.id]);
    expect(rows[0].status).toBe("pending");
  });

  it("owner aprova o pedido de outro staff — pending -> approved, com approver e expires_at gravados", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const pedido = await requestImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "ticket", targetAccountId: contaId },
    );

    const aprovado = await approveImpersonation(
      { pool: app },
      { actor: actor(ownerId, ["owner"]), reason: "confirmado com o cliente", requestId: pedido.id },
    );

    expect(aprovado.status).toBe("approved");
    expect(aprovado.approverStaffId).toBe(ownerId);
    expect(aprovado.expiresAt).not.toBeNull();
    expect(aprovado.expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("owner também cria e auto-aprova — o registro continua existindo em AMBAS as transições", async () => {
    await prepararBanco();
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();

    const pedido = await requestImpersonation(
      { pool: app },
      { actor: actor(ownerId, ["owner"]), reason: "verificação própria", targetAccountId: contaId },
    );
    const aprovado = await approveImpersonation(
      { pool: app },
      { actor: actor(ownerId, ["owner"]), reason: "auto-aprovado", requestId: pedido.id },
    );

    expect(aprovado.status).toBe("approved");
    expect(aprovado.requesterStaffId).toBe(ownerId);
    expect(aprovado.approverStaffId).toBe(ownerId);

    const { rows } = await admin.query(
      "SELECT action FROM audit_log WHERE target_kind = 'impersonation_request' AND target_id = $1 ORDER BY at ASC",
      [pedido.id],
    );
    expect(rows.map((r) => r.action)).toEqual(["impersonate.request", "impersonate.approve"]);
  });

  it("denyImpersonation move pending -> denied e grava a transição na auditoria", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const pedido = await requestImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "ticket duvidoso", targetAccountId: contaId },
    );

    const negado = await denyImpersonation(
      { pool: app },
      { actor: actor(ownerId, ["owner"]), reason: "sem justificativa suficiente", requestId: pedido.id },
    );

    expect(negado.status).toBe("denied");
    const { rows } = await admin.query(
      "SELECT 1 FROM audit_log WHERE action = 'impersonate.deny' AND target_kind = 'impersonation_request' AND target_id = $1",
      [pedido.id],
    );
    expect(rows).toHaveLength(1);
  });
});
