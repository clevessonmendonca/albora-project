import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@albora/core";
import { listSecurityEvents } from "@albora/db";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "./errors";
import { executeQuery } from "./query";

let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await app?.end();
});

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    staffUserId: "22222222-2222-2222-2222-222222222222",
    roles: ["support"], sessionId: "sess-2", requestId: "req-2", reauthenticatedAt: null,
    ...overrides,
  };
}

describe("executeQuery", () => {
  it("caminho feliz roda e devolve o resultado do run", async () => {
    const resultado = await executeQuery({ pool: app }, {
      actor: actor(), capability: "accounts.read", run: async () => "ok",
    });
    expect(resultado).toBe("ok");
  });

  it("negado grava security_events e lança sem esperar a leitura", async () => {
    await expect(
      executeQuery({ pool: app }, {
        actor: actor({ roles: ["engineering"] }), capability: "accounts.pii.reveal",
        run: async () => { throw new Error("não deveria rodar"); },
      }),
    ).rejects.toThrow(CommandDeniedError);

    await new Promise((r) => setTimeout(r, 50));
    const { rows } = await listSecurityEvents(app, { kind: "capability.denied", limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
  });
});
