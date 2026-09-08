import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  approveImpersonationRequestOnClient,
  createImpersonationRequestOnClient,
  createStaffUser,
  startImpersonationRequestOnClient,
} from "@albora/db";
import { prepararBanco } from "@albora/db/testes/banco";
import { getActiveImpersonationForStaff } from "./get-active-impersonation";

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

async function fixture() {
  const sufixo = Math.random().toString(36).slice(2);
  const requester = await createStaffUser(admin, { email: `req-${sufixo}@albora.com`, name: "Suporte" });
  const approver = await createStaffUser(admin, { email: `owner-${sufixo}@albora.com`, name: "Dono" });
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${sufixo}@exemplo.test`,
  ]);
  return { requesterId: requester.id, approverId: approver.id, accountId: rows[0].id as string };
}

/**
 * Sem gate de capacidade — autoconsulta por `staffUserId`. Não há teste de
 * "negado por falta de capacidade" aqui de propósito: qualquer ator
 * autenticado precisa desta resposta pra saber se o banner aparece.
 */
describe("getActiveImpersonationForStaff (application)", () => {
  it("sem sessão ativa devolve null", async () => {
    await prepararBanco();
    const { requesterId } = await fixture();
    const resultado = await getActiveImpersonationForStaff(app, requesterId);
    expect(resultado).toBeNull();
  });

  it("com sessão active devolve o pedido — chama o mesmo db layer que o banner usa", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId,
        targetAccountId: accountId,
        reason: "ticket p0",
      });
      pedidoId = pedido.id;
      await approveImpersonationRequestOnClient(client, { id: pedido.id, approverStaffId: approverId, ttlMinutes: 30 });
      await startImpersonationRequestOnClient(client, { id: pedido.id });
    } finally {
      client.release();
    }

    const resultado = await getActiveImpersonationForStaff(app, requesterId);
    expect(resultado?.id).toBe(pedidoId);
    expect(resultado?.status).toBe("active");
  });
});
