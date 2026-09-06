import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { createDsarRequestOnClient, getDsarRequestAdmin } from "@albora/db";
import { CommandDeniedError } from "../envelope/errors";
import { updateDsarRequest } from "./update-dsar-request";

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

function actor(roles: string[]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "s",
    requestId: "r",
    reauthenticatedAt: null,
  };
}

async function contaFixture(email: string) {
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [email]);
  return rows[0].id as string;
}

async function pedidoFixture(contaId: string) {
  const client = await app.connect();
  try {
    await client.query("BEGIN");
    const criado = await createDsarRequestOnClient(client, {
      kind: "portability",
      subjectAccountId: contaId,
      legalDueAt: new Date(Date.now() + 86_400_000),
    });
    await client.query("COMMIT");
    return criado.id;
  } finally {
    client.release();
  }
}

describe("updateDsarRequest", () => {
  it("nega quem não tem lgpd.dsar.execute e nada muda no banco", async () => {
    await prepararBanco();
    const contaId = await contaFixture("titular-update1@exemplo.test");
    const id = await pedidoFixture(contaId);

    await expect(
      updateDsarRequest({ pool: app }, { actor: actor(["engineering"]), reason: "tentativa", id, status: "completed" }),
    ).rejects.toThrow(CommandDeniedError);

    const atual = await getDsarRequestAdmin(app, id);
    expect(atual?.status).toBe("open");
  });

  it("atualiza status, grava audit_log com target_kind dsar_request, e metadata não contém o texto de notes", async () => {
    await prepararBanco();
    const contaId = await contaFixture("titular-update2@exemplo.test");
    const id = await pedidoFixture(contaId);

    const notaSensivel = "titular pediu por telefone, confirmar com fulano@exemplo.test antes de concluir";
    await updateDsarRequest(
      { pool: app },
      { actor: actor(["compliance"]), reason: "exportado e enviado ao titular por e-mail", id, status: "completed", notes: notaSensivel },
    );

    const atual = await getDsarRequestAdmin(app, id);
    expect(atual?.status).toBe("completed");
    expect(atual?.notes).toBe(notaSensivel);
    expect(atual?.completedAt).not.toBeNull();

    const { rows: auditoria } = await admin.query(
      "SELECT * FROM audit_log WHERE target_kind = 'dsar_request' AND target_id = $1",
      [id],
    );
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0].action).toBe("lgpd.dsar.update");
    const metadataSerializada = JSON.stringify(auditoria[0].metadata);
    expect(metadataSerializada).not.toContain(notaSensivel);
    expect(metadataSerializada).not.toContain("fulano@exemplo.test");
    expect(metadataSerializada).toContain("completed");
  });
});
