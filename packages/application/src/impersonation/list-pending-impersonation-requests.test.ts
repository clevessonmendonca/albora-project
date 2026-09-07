import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@albora/core";
import { createImpersonationRequestOnClient, createStaffUser } from "@albora/db";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { listPendingImpersonationRequests } from "./list-pending-impersonation-requests";

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

function actor(roles: Actor["roles"], staffUserId = "s1"): Actor {
  return { staffUserId, roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

async function fixture() {
  const sufixo = Math.random().toString(36).slice(2);
  const requester = await createStaffUser(admin, { email: `req-${sufixo}@albora.com`, name: "Suporte" });
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${sufixo}@exemplo.test`,
  ]);
  return { requesterId: requester.id, accountId: rows[0].id as string };
}

/**
 * Cross-staff (lista TODOS os pedidos pendentes da plataforma) — diferente
 * dos outros dois reads de impersonação desta task, este exige
 * `impersonate.approve` via `executeQuery` (só `owner` tem, `roles.ts`).
 */
describe("listPendingImpersonationRequests (application)", () => {
  it("support (sem impersonate.approve) é negado — nada devolvido", async () => {
    await expect(
      listPendingImpersonationRequests({ pool: {} as never }, { actor: actor(["support"]) }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("owner (com impersonate.approve) lista os pedidos pendentes", async () => {
    await prepararBanco();
    const { requesterId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId,
        targetAccountId: accountId,
        reason: "ticket p1",
      });
      pedidoId = pedido.id;
    } finally {
      client.release();
    }

    const pendentes = await listPendingImpersonationRequests({ pool: app }, { actor: actor(["owner"]) });
    expect(pendentes.some((p) => p.id === pedidoId)).toBe(true);
  });
});
