import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { listAccounts } from "./list-accounts";
import { prepararBanco, semear } from "@albora/db/testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
  await agregador?.end();
});

function actor(roles: string[]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

describe("listAccounts", () => {
  it("nega quem não tem accounts.read", async () => {
    await expect(
      listAccounts(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["engineering"]), reason: "abrir /console/accounts", limit: 20 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("carrega a base da aproximação de 'último login' até a linha, não só até o comentário da query", async () => {
    await prepararBanco();
    await semear(admin);

    const { rows } = await listAccounts(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "abrir /console/accounts", limit: 20 },
    );

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.lastAccessAt.approximate).toBe(true);
      expect(row.lastAccessAt.approximationBasis).toContain("último login");
      expect(row.lastAccessAt.approximationBasis).toContain("host_sessions");
    }
  });
});
