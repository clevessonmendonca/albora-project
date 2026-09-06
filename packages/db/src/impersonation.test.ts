import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";
import {
  approveImpersonationRequestOnClient,
  createImpersonationRequestOnClient,
  denyImpersonationRequestOnClient,
  endImpersonationRequestOnClient,
  getActiveImpersonationForStaff,
  getImpersonationRequestById,
  getLatestImpersonationRequestForRequesterAndAccount,
  listPendingImpersonationRequestsAdmin,
  startImpersonationRequestOnClient,
} from "./impersonation";

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
  const { rows: staffReq } = await admin.query(
    "INSERT INTO staff_users (email, name) VALUES ($1, 'Suporte') RETURNING id",
    [`req-${sufixo}@albora.com`],
  );
  const { rows: staffOwner } = await admin.query(
    "INSERT INTO staff_users (email, name) VALUES ($1, 'Dono') RETURNING id",
    [`owner-${sufixo}@albora.com`],
  );
  const { rows: conta } = await admin.query(
    "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
    [`titular-${sufixo}@exemplo.test`],
  );
  return { requesterId: staffReq[0].id as string, approverId: staffOwner[0].id as string, accountId: conta[0].id as string };
}

describe("impersonation: ciclo de vida pending -> approved -> active -> ended", () => {
  it("pending -> approved -> active, some da lista de ativos ao terminar", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket p0",
      });
      pedidoId = pedido.id;
      expect(pedido.status).toBe("pending");
      expect(pedido.expiresAt).toBeNull();
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      const aprovado = await approveImpersonationRequestOnClient(client2, {
        id: pedidoId, approverStaffId: approverId, ttlMinutes: 30,
      });
      expect(aprovado.status).toBe("approved");
      expect(aprovado.expiresAt).not.toBeNull();
      expect(aprovado.expiresAt!.getTime()).toBeGreaterThan(Date.now());
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }

    const client3 = await app.connect();
    try {
      await client3.query("BEGIN");
      const ativado = await startImpersonationRequestOnClient(client3, { id: pedidoId });
      expect(ativado.status).toBe("active");
      expect(ativado.startedAt).not.toBeNull();
      await client3.query("COMMIT");
    } finally {
      client3.release();
    }

    const ativo = await getActiveImpersonationForStaff(app, requesterId);
    expect(ativo?.id).toBe(pedidoId);

    const client4 = await app.connect();
    try {
      await client4.query("BEGIN");
      const encerrado = await endImpersonationRequestOnClient(client4, { id: pedidoId });
      expect(encerrado.status).toBe("ended");
      expect(encerrado.endedAt).not.toBeNull();
      await client4.query("COMMIT");
    } finally {
      client4.release();
    }

    const depoisDeEncerrar = await getActiveImpersonationForStaff(app, requesterId);
    expect(depoisDeEncerrar).toBeNull();
  });

  it("approve só funciona a partir de pending — segunda aprovação do mesmo pedido falha (uso único)", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket",
      });
      pedidoId = pedido.id;
      await approveImpersonationRequestOnClient(client, { id: pedidoId, approverStaffId: approverId, ttlMinutes: 30 });
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await expect(
        approveImpersonationRequestOnClient(client2, { id: pedidoId, approverStaffId: approverId, ttlMinutes: 30 }),
      ).rejects.toThrow();
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }
  });

  it("deny move pending -> denied", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket",
      });
      const negado = await denyImpersonationRequestOnClient(client, { id: pedido.id, approverStaffId: approverId });
      expect(negado.status).toBe("denied");
      await client.query("COMMIT");
    } finally {
      client.release();
    }
  });

  it("iniciar duas vezes o mesmo pedido falha — uso único na ativação", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket",
      });
      pedidoId = pedido.id;
      await approveImpersonationRequestOnClient(client, { id: pedidoId, approverStaffId: approverId, ttlMinutes: 30 });
      const primeiro = await startImpersonationRequestOnClient(client, { id: pedidoId });
      expect(primeiro.status).toBe("active");
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await expect(startImpersonationRequestOnClient(client2, { id: pedidoId })).rejects.toThrow();
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }
  });

  it("pedido expirado não inicia — data relativa a agora, nunca literal", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket",
      });
      pedidoId = pedido.id;
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    // Aprova e força o TTL pro passado — expires_at relativo a `now()` no momento do teste, nunca uma data literal.
    await admin.query(
      `UPDATE impersonation_requests
          SET status = 'approved', approver_staff_id = $2, approved_at = now() - interval '1 hour',
              expires_at = now() - interval '1 minute'
        WHERE id = $1`,
      [pedidoId, approverId],
    );

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await expect(startImpersonationRequestOnClient(client2, { id: pedidoId })).rejects.toThrow();
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }
    const depois = await getImpersonationRequestById(app, pedidoId);
    expect(depois?.status).toBe("approved");
  });

  it("pedido pending (não aprovado) não inicia", async () => {
    await prepararBanco();
    const { requesterId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket",
      });
      pedidoId = pedido.id;
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await expect(startImpersonationRequestOnClient(client2, { id: pedidoId })).rejects.toThrow();
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }
  });

  it("endImpersonation revoga a sessão de host marcada com este pedido", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket",
      });
      pedidoId = pedido.id;
      await approveImpersonationRequestOnClient(client, { id: pedidoId, approverStaffId: approverId, ttlMinutes: 30 });
      await startImpersonationRequestOnClient(client, { id: pedidoId });
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    await admin.query(
      "INSERT INTO host_sessions (token_hash, account_id, expires_at, impersonation_id) VALUES ($1, $2, now() + interval '30 minutes', $3)",
      [Buffer.from(`sessao-${pedidoId}`), accountId, pedidoId],
    );

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await endImpersonationRequestOnClient(client2, { id: pedidoId });
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }

    const { rows } = await admin.query<{ revoked_at: Date | null }>(
      "SELECT revoked_at FROM host_sessions WHERE impersonation_id = $1",
      [pedidoId],
    );
    expect(rows[0]?.revoked_at).not.toBeNull();
  });
});

describe("listPendingImpersonationRequestsAdmin", () => {
  it("lista só pending, mais antigo primeiro — aprovado/negado somem da lista", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      const primeiro = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket 1",
      });
      const segundo = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket 2",
      });
      await approveImpersonationRequestOnClient(client, { id: segundo.id, approverStaffId: approverId, ttlMinutes: 30 });
      await client.query("COMMIT");

      const pendentes = await listPendingImpersonationRequestsAdmin(app);
      expect(pendentes.map((p) => p.id)).toEqual([primeiro.id]);
    } finally {
      client.release();
    }
  });
});

describe("getLatestImpersonationRequestForRequesterAndAccount", () => {
  it("sem pedido para este par staff/conta devolve null", async () => {
    await prepararBanco();
    const { requesterId, accountId } = await fixture();
    const resultado = await getLatestImpersonationRequestForRequesterAndAccount(app, requesterId, accountId);
    expect(resultado).toBeNull();
  });

  it("devolve o pedido mais recente deste staff para esta conta, não o de outro staff nem de outra conta", async () => {
    await prepararBanco();
    const { requesterId, accountId } = await fixture();
    const { requesterId: outroRequesterId } = await fixture();
    const { accountId: outraContaId } = await fixture();
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: outraContaId, reason: "conta errada",
      });
      await createImpersonationRequestOnClient(client, {
        requesterStaffId: outroRequesterId, targetAccountId: accountId, reason: "staff errado",
      });
      const maisRecente = await createImpersonationRequestOnClient(client, {
        requesterStaffId: requesterId, targetAccountId: accountId, reason: "o pedido certo",
      });
      await client.query("COMMIT");

      const resultado = await getLatestImpersonationRequestForRequesterAndAccount(app, requesterId, accountId);
      expect(resultado?.id).toBe(maisRecente.id);
      expect(resultado?.reason).toBe("o pedido certo");
    } finally {
      client.release();
    }
  });
});
