import { prepararBanco, semear } from "@albora/db/testes/banco";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { getEvent } from "./get-event";

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

function actor(roles: string[] = ["owner"]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

describe("getEvent", () => {
  it("nega quem não tem events.read", async () => {
    await expect(
      getEvent({ pool: {} as never, aggregatorPool: {} as never }, { actor: actor([]), reason: "x", eventId: "e1" }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("evento inexistente devolve null, não objeto vazio", async () => {
    await prepararBanco();
    const evento = await getEvent(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir evento", eventId: "00000000-0000-0000-0000-000000000000" },
    );
    expect(evento).toBeNull();
  });

  it("evento existente traz funil e consentimento agregados, sem nome de convidado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const evento = await getEvent(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir evento", eventId: a.eventoId },
    );

    expect(evento?.id).toBe(a.eventoId);
    expect(evento?.consentsByVersion.some((c) => c.versao === "v1")).toBe(true);
    expect(JSON.stringify(evento)).not.toContain("convidado-evento-a");
  });
});
