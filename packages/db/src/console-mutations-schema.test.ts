import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertAuditLog } from "./audit";
import { prepararBanco } from "./testes/banco";

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

async function contaEStaff() {
  const sufixo = Math.random().toString(36).slice(2);
  const { rows: c } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${sufixo}@exemplo.test`,
  ]);
  const { rows: s } = await admin.query(
    "INSERT INTO staff_users (email, name) VALUES ($1, $2) RETURNING id",
    [`staff-${sufixo}@albora.com`, "Staff de Teste"],
  );
  return { contaId: c[0].id as string, staffId: s[0].id as string };
}

describe("migration 0062", () => {
  it("impersonation_requests recusa reason vazio", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    await expect(
      admin.query(
        `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason)
         VALUES ($1, $2, '')`,
        [staffId, contaId],
      ),
    ).rejects.toThrow();
  });

  it("impersonation_requests recusa status fora do enum", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    await expect(
      admin.query(
        `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason, status)
         VALUES ($1, $2, 'motivo válido', 'inventado')`,
        [staffId, contaId],
      ),
    ).rejects.toThrow();
  });

  it("impersonation_requests aceita o ciclo pending -> approved -> active -> ended", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason)
       VALUES ($1, $2, 'atender ticket p0') RETURNING id`,
      [staffId, contaId],
    );
    const id = rows[0]!.id;
    for (const status of ["approved", "active", "ended"]) {
      await admin.query("UPDATE impersonation_requests SET status = $2 WHERE id = $1", [id, status]);
    }
    const { rows: atual } = await admin.query("SELECT status FROM impersonation_requests WHERE id = $1", [id]);
    expect(atual[0].status).toBe("ended");
  });

  it("host_sessions aceita impersonation_id apontando para um pedido", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    const { rows: pedido } = await admin.query<{ id: string }>(
      `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason)
       VALUES ($1, $2, 'suporte') RETURNING id`,
      [staffId, contaId],
    );
    await expect(
      admin.query(
        `INSERT INTO host_sessions (token_hash, account_id, expires_at, impersonation_id)
         VALUES ($1, $2, now() + interval '30 minutes', $3)`,
        [Buffer.from("hash-de-teste"), contaId, pedido[0]!.id],
      ),
    ).resolves.not.toThrow();
  });

  it("dsar_requests recusa kind fora do enum", async () => {
    await prepararBanco();
    const { contaId } = await contaEStaff();
    await expect(
      admin.query(
        `INSERT INTO dsar_requests (kind, subject_account_id, legal_due_at)
         VALUES ('inventado', $1, now() + interval '15 days')`,
        [contaId],
      ),
    ).rejects.toThrow();
  });

  it("dsar_requests aceita os quatro tipos previstos", async () => {
    await prepararBanco();
    const { contaId } = await contaEStaff();
    for (const kind of ["access", "portability", "rectification", "deletion"]) {
      await expect(
        admin.query(
          `INSERT INTO dsar_requests (kind, subject_account_id, legal_due_at)
           VALUES ($1, $2, now() + interval '15 days')`,
          [kind, contaId],
        ),
      ).resolves.not.toThrow();
    }
  });

  it("support_tickets.assignee_staff_id aceita um staff e some sozinho quando o staff é removido", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    const { rows: t } = await admin.query<{ id: string }>(
      `INSERT INTO support_tickets (account_id, source, subject, assignee_staff_id)
       VALUES ($1, 'admin', 'dúvida', $2) RETURNING id`,
      [contaId, staffId],
    );
    await admin.query("DELETE FROM staff_users WHERE id = $1", [staffId]);
    const { rows: depois } = await admin.query("SELECT assignee_staff_id FROM support_tickets WHERE id = $1", [
      t[0]!.id,
    ]);
    expect(depois[0].assignee_staff_id).toBeNull();
  });

  it("audit_log aceita os três target_kind novos desta onda", async () => {
    await prepararBanco();
    const client = await app.connect();
    try {
      for (const targetKind of ["dsar_request", "impersonation_request", "payment"] as const) {
        await expect(
          insertAuditLog(client, {
            actorKind: "staff",
            action: "teste.schema",
            targetKind,
            reason: "prova de schema da migration 0062",
          }),
        ).resolves.toBeTruthy();
      }
    } finally {
      client.release();
    }
  });
});
