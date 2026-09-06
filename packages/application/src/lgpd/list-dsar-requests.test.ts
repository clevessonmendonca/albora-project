import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { createDsarRequestOnClient } from "@albora/db";
import { CommandDeniedError } from "../envelope/errors";
import { listDsarRequests } from "./list-dsar-requests";

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

describe("listDsarRequests", () => {
  it("nega quem não tem lgpd.dsar.read", async () => {
    await expect(listDsarRequests({ pool: app }, { actor: actor(["engineering"]), limit: 10 })).rejects.toThrow(
      CommandDeniedError,
    );
  });

  it("compliance lê a fila, ordenada pelo prazo mais próximo", async () => {
    await prepararBanco();
    const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ('titular-lista@exemplo.test') RETURNING id");
    const contaId = acc[0].id as string;

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

    const { rows } = await listDsarRequests({ pool: app }, { actor: actor(["compliance"]), statuses: ["open"], limit: 20 });
    expect(rows[0]?.kind).toBe("deletion");
    expect(rows[1]?.kind).toBe("access");
  });
});
