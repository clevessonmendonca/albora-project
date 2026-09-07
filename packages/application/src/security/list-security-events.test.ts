import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertSecurityEvent, type SecurityEventRow } from "@albora/db";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { groupSecurityEvents, listSecurity } from "./list-security-events";

let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await app?.end();
});

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function linha(kind: SecurityEventRow["kind"]): SecurityEventRow {
  return {
    id: randomUUID(),
    at: new Date(),
    kind,
    actorKind: null,
    actorId: null,
    ipHash: null,
    requestId: null,
    metadata: {},
  };
}

describe("listSecurity", () => {
  it("nega quem não tem security.read", async () => {
    await expect(listSecurity({ pool: {} as never }, { actor: actor(["finance"]), limit: 20 })).rejects.toThrow(
      CommandDeniedError,
    );
  });

  it("filtro por período respeita a janela — since no futuro exclui o evento, since no passado inclui", async () => {
    const marcador = randomUUID();
    await insertSecurityEvent(app, { kind: "rate_limit.exceeded", actorId: marcador });

    const UM_MINUTO_MS = 60_000;

    const comSinceNoFuturo = await listSecurity(
      { pool: app },
      { actor: actor(["owner"]), actorId: marcador, since: new Date(Date.now() + UM_MINUTO_MS), limit: 20 },
    );
    expect(comSinceNoFuturo.rows).toHaveLength(0);

    const comSinceNoPassado = await listSecurity(
      { pool: app },
      { actor: actor(["owner"]), actorId: marcador, since: new Date(Date.now() - UM_MINUTO_MS), limit: 20 },
    );
    expect(comSinceNoPassado.rows).toHaveLength(1);
    expect(comSinceNoPassado.rows[0]!.actorId).toBe(marcador);
  });
});

describe("groupSecurityEvents", () => {
  it("agrupa por tipo e devolve a contagem correta", () => {
    const rows = [
      linha("login.failed"),
      linha("login.failed"),
      linha("rate_limit.exceeded"),
      linha("session.reuse"),
    ];

    const grupos = groupSecurityEvents(rows);

    expect(grupos.find((g) => g.kind === "login.failed")?.count).toBe(2);
    expect(grupos.find((g) => g.kind === "rate_limit.exceeded")?.count).toBe(1);
    expect(grupos.find((g) => g.kind === "session.reuse")?.count).toBe(1);
    expect(grupos.reduce((soma, g) => soma + g.count, 0)).toBe(rows.length);
  });

  it("lista vazia devolve grupos vazios", () => {
    expect(groupSecurityEvents([])).toEqual([]);
  });
});
