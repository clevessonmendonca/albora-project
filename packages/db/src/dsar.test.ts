import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";
import {
  createDsarRequestOnClient,
  getDsarRequestAdmin,
  listDsarRequestsAdmin,
  updateDsarRequestOnClient,
} from "./dsar";

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

async function contaFixture() {
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${Math.random().toString(36).slice(2)}@exemplo.test`,
  ]);
  return rows[0].id as string;
}

describe("dsar", () => {
  it("cria e lista por status, ordenado pelo prazo mais próximo", async () => {
    await prepararBanco();
    const contaId = await contaFixture();
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      await createDsarRequestOnClient(client, {
        kind: "access",
        subjectAccountId: contaId,
        legalDueAt: new Date(Date.now() + 20 * 86_400_000),
      });
      await createDsarRequestOnClient(client, {
        kind: "deletion",
        subjectAccountId: contaId,
        legalDueAt: new Date(Date.now() + 2 * 86_400_000),
      });
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const { rows } = await listDsarRequestsAdmin(app, { statuses: ["open"], limit: 20 });
    expect(rows[0]?.kind).toBe("deletion");
    expect(rows[1]?.kind).toBe("access");
  });

  it("legal_due_at é obrigatório — nunca há prazo padrão calculado pelo banco", async () => {
    await prepararBanco();
    const contaId = await contaFixture();
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      await expect(
        client.query("INSERT INTO dsar_requests (kind, subject_account_id) VALUES ($1, $2)", ["access", contaId]),
      ).rejects.toThrow();
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
  });

  it("atualiza status/atribuição/notas", async () => {
    await prepararBanco();
    const contaId = await contaFixture();
    const client = await app.connect();
    let id = "";
    try {
      await client.query("BEGIN");
      const criado = await createDsarRequestOnClient(client, {
        kind: "portability",
        subjectAccountId: contaId,
        legalDueAt: new Date(Date.now() + 86_400_000),
      });
      id = criado.id;
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await updateDsarRequestOnClient(client2, { id, status: "completed", notes: "exportado via Drive" });
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }

    const atual = await getDsarRequestAdmin(app, id);
    expect(atual?.status).toBe("completed");
    expect(atual?.notes).toBe("exportado via Drive");
    expect(atual?.completedAt).not.toBeNull();
  });

  it("assigneeStaffId explícito como null desatribui — não é o mesmo que omitido", async () => {
    await prepararBanco();
    const contaId = await contaFixture();
    const { rows: staff } = await admin.query(
      "INSERT INTO staff_users (email, name, status) VALUES ('lgpd-staff@exemplo.test', 'Staff', 'active') RETURNING id",
    );
    const staffId = staff[0].id as string;

    const client = await app.connect();
    let id = "";
    try {
      await client.query("BEGIN");
      const criado = await createDsarRequestOnClient(client, {
        kind: "access",
        subjectAccountId: contaId,
        legalDueAt: new Date(Date.now() + 86_400_000),
      });
      id = criado.id;
      await updateDsarRequestOnClient(client, { id, assigneeStaffId: staffId });
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    let atual = await getDsarRequestAdmin(app, id);
    expect(atual?.assigneeStaffId).toBe(staffId);

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await updateDsarRequestOnClient(client2, { id, assigneeStaffId: null });
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }

    atual = await getDsarRequestAdmin(app, id);
    expect(atual?.assigneeStaffId).toBeNull();
  });
});
