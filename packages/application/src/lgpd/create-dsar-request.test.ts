import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { createDsarRequest } from "./create-dsar-request";

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

describe("createDsarRequest", () => {
  it("nega quem não tem lgpd.dsar.execute e nada muda no banco", async () => {
    await prepararBanco();
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ('titular2@exemplo.test') RETURNING id");
    await expect(
      createDsarRequest(
        { pool: app },
        {
          actor: actor(["engineering"]),
          reason: "pedido recebido por e-mail",
          kind: "access",
          subjectAccountId: rows[0].id,
          legalDueAt: new Date(Date.now() + 86_400_000 * 15),
        },
      ),
    ).rejects.toThrow(CommandDeniedError);

    const { rows: total } = await admin.query("SELECT count(*)::int AS n FROM dsar_requests");
    expect(total[0].n).toBe(0);
  });

  it("compliance registra o pedido e grava audit_log", async () => {
    await prepararBanco();
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ('titular3@exemplo.test') RETURNING id");
    const criado = await createDsarRequest(
      { pool: app },
      {
        actor: actor(["compliance"]),
        reason: "pedido recebido por e-mail",
        kind: "deletion",
        subjectAccountId: rows[0].id,
        legalDueAt: new Date(Date.now() + 86_400_000 * 15),
      },
    );
    expect(criado.status).toBe("open");

    const { rows: auditoria } = await admin.query("SELECT * FROM audit_log WHERE target_kind = 'dsar_request'");
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0].target_id).toBe(criado.id);
    expect(auditoria[0].action).toBe("lgpd.dsar.create");
  });

  it("sem legalDueAt falha — nenhuma fonte no produto define prazo padrão por tipo de pedido", async () => {
    await prepararBanco();
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ('titular4@exemplo.test') RETURNING id");
    const entradaSemPrazo = {
      actor: actor(["compliance"]),
      reason: "pedido recebido por e-mail",
      kind: "access",
      subjectAccountId: rows[0].id,
    };
    await expect(createDsarRequest({ pool: app }, entradaSemPrazo as never)).rejects.toThrow();

    const { rows: total } = await admin.query("SELECT count(*)::int AS n FROM dsar_requests");
    expect(total[0].n).toBe(0);
  });
});
