import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@albora/core";
import { prepararBanco } from "@albora/db/testes/banco";
import { withPlatformAggregation } from "./aggregation";

let app: pg.Pool;
let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await app?.end();
  await admin?.end();
  await agregador?.end();
});

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    staffUserId: "33333333-3333-3333-3333-333333333333",
    roles: ["owner"],
    sessionId: "sess-3",
    requestId: "req-3",
    reauthenticatedAt: null,
    ...overrides,
  };
}

describe("withPlatformAggregation", () => {
  it("reason vazio rejeita antes de conectar em qualquer pool", async () => {
    await expect(
      withPlatformAggregation({ pool: app, aggregatorPool: agregador }, {
        actor: actor(), capability: "analytics.platform.read", reason: "  ",
        run: async () => { throw new Error("não deveria conectar"); },
      }),
    ).rejects.toThrow();
  });

  it("ator sem analytics.platform.read é negado, e a agregação não roda", async () => {
    // compliance não tem analytics.platform.read na tabela de capacidades (§5.2 da spec)
    let rodou = false;
    await expect(
      withPlatformAggregation({ pool: app, aggregatorPool: agregador }, {
        actor: actor({ roles: ["compliance"] }), capability: "analytics.platform.read",
        reason: "tentativa sem capacidade",
        run: async () => { rodou = true; throw new Error("não deveria conectar"); },
      }),
    ).rejects.toThrow();
    expect(rodou).toBe(false);
  });

  it("caminho feliz grava exatamente uma linha em audit_log com target_kind platform", async () => {
    const antes = await app.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'aggregation.read'",
    );

    const resultado = await withPlatformAggregation({ pool: app, aggregatorPool: agregador }, {
      actor: actor(), capability: "analytics.platform.read", reason: "dashboard do dono",
      run: async (client) => {
        const { rows } = await client.query<{ n: string }>("SELECT count(*)::text AS n FROM events");
        return rows[0]?.n ?? "0";
      },
    });
    expect(typeof resultado).toBe("string");

    const depois = await app.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'aggregation.read'",
    );
    expect(Number(depois.rows[0]!.n) - Number(antes.rows[0]!.n)).toBe(1);

    const { rows } = await app.query<{ target_kind: string }>(
      "SELECT target_kind FROM audit_log WHERE action = 'aggregation.read' ORDER BY at DESC LIMIT 1",
    );
    expect(rows[0]?.target_kind).toBe("platform");
  });

  it("auditoria que falha impede a agregação — run nunca executa", async () => {
    await admin.query("CREATE TABLE IF NOT EXISTS scratch_aggregation_marker (id serial PRIMARY KEY, note text)");
    await admin.query("DELETE FROM scratch_aggregation_marker");

    await expect(
      withPlatformAggregation({ pool: app, aggregatorPool: agregador }, {
        // staffUserId inválido quebra o INSERT em audit_log (coluna actor_id é uuid) —
        // força a auditoria a falhar sem depender de nenhuma coluna que o
        // primitivo deixe o chamador controlar (target_kind é sempre 'platform').
        actor: actor({ staffUserId: "not-a-uuid" }),
        capability: "analytics.platform.read",
        reason: "força falha de auditoria para provar a pré-condição",
        run: async (client) => {
          await client.query("INSERT INTO scratch_aggregation_marker (note) VALUES ('rodou')");
          return "não deveria chegar aqui";
        },
      }),
    ).rejects.toThrow();

    const { rows } = await app.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM scratch_aggregation_marker",
    );
    expect(rows[0]?.n).toBe("0");
  });
});
