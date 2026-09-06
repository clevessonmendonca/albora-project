import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createImpersonationRequestOnClient, createStaffUser } from "@albora/db";
import { prepararBanco } from "@albora/db/testes/banco";
import { getLatestImpersonationRequestForRequesterAndAccount } from "./get-latest-impersonation-request";

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
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${sufixo}@exemplo.test`,
  ]);
  return { requesterId: requester.id, accountId: rows[0].id as string };
}

/**
 * Sem gate de capacidade — autoconsulta pelo par (staff que chama, conta
 * que está olhando). O Drawer de "Ver como" (T10) usa isto pra decidir
 * entre formulário, "aguardando aprovação", "iniciar" ou "expirado".
 */
describe("getLatestImpersonationRequestForRequesterAndAccount (application)", () => {
  it("sem pedido devolve null", async () => {
    await prepararBanco();
    const { requesterId, accountId } = await fixture();
    const resultado = await getLatestImpersonationRequestForRequesterAndAccount(app, requesterId, accountId);
    expect(resultado).toBeNull();
  });

  it("devolve o pedido mais recente deste staff para esta conta — chama o mesmo db layer", async () => {
    await prepararBanco();
    const { requesterId, accountId } = await fixture();
    const client = await app.connect();
    let maisRecenteId = "";
    try {
      await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId,
        targetAccountId: accountId,
        reason: "primeiro pedido",
      });
      const maisRecente = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId,
        targetAccountId: accountId,
        reason: "pedido mais recente",
      });
      maisRecenteId = maisRecente.id;
    } finally {
      client.release();
    }

    const resultado = await getLatestImpersonationRequestForRequesterAndAccount(app, requesterId, accountId);
    expect(resultado?.id).toBe(maisRecenteId);
    expect(resultado?.reason).toBe("pedido mais recente");
  });
});
