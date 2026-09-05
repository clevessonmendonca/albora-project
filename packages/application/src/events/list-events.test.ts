import { prepararBanco, semear } from "@albora/db/testes/banco";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { listEvents } from "./list-events";

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

describe("listEvents", () => {
  it("nega quem não tem events.read — e a query não roda", async () => {
    await expect(
      listEvents({ pool: {} as never, aggregatorPool: {} as never }, { actor: actor([]), reason: "x", limit: 20 }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("ator sem events.read não dispara nenhuma query — pool nunca é tocado", async () => {
    // `finance` é o único papel sem `events.read` (packages/core/src/authorization/roles.ts).
    const poolQueSempreLança = {
      query: () => {
        throw new Error("a query não deveria rodar");
      },
      connect: () => {
        throw new Error("a query não deveria rodar");
      },
    } as never;

    await expect(
      listEvents(
        { pool: poolQueSempreLança, aggregatorPool: poolQueSempreLança },
        { actor: actor(["finance"]), reason: "abrir /console/events", limit: 20 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("traz H1 por evento pra quem tem events.read", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await admin.query("UPDATE events SET expected_guests = 1 WHERE id = $1", [a.eventoId]);

    const { rows } = await listEvents(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "abrir /console/events", limit: 20 },
    );

    const evento = rows.find((r) => r.id === a.eventoId);
    expect(evento?.h1).toBeCloseTo(1, 5);
  });

  it("paginação por cursor não repete linha entre páginas", async () => {
    await prepararBanco();
    await semear(admin); // dois eventos, sob contas distintas

    const primeira = await listEvents(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "abrir /console/events", limit: 1 },
    );
    expect(primeira.nextCursor).not.toBeNull();

    const segunda = await listEvents(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "abrir /console/events", limit: 1, cursor: primeira.nextCursor! },
    );

    expect(segunda.rows).toHaveLength(1);
    expect(segunda.rows[0]?.id).not.toBe(primeira.rows[0]?.id);
  });
});
