import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { getPlatformOverview } from "./platform-overview";
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

function actor(roles: string[] = ["owner"]) {
  return { staffUserId: "11111111-1111-1111-1111-111111111111", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("getPlatformOverview", () => {
  it("nega quem não tem analytics.platform.read", async () => {
    // `support` tem `analytics.platform.read` (packages/core/src/authorization/roles.ts) —
    // `compliance` é o único papel sem essa capability, então é ele que testa negação de verdade.
    await expect(
      getPlatformOverview(
        { pool: app, aggregatorPool: agregador },
        { actor: actor(["compliance"] as never), reason: "abrir /console", days: 30 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("sem evento nenhum no banco -> H1 atual e baseline vêm null, não 0/0 fingindo dado", async () => {
    await prepararBanco(); // reseta o schema — nenhum evento semeado nesta suíte
    const overview = await getPlatformOverview(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir /console", days: 30 },
    );
    expect(overview.h1.current).toBeNull();
    expect(overview.h1.baseline).toBeNull();
  });

  it("evento com expected_guests e upload na janela produz H1 real, não null", async () => {
    const { a, b } = await semear(admin);
    await admin.query("UPDATE events SET expected_guests = 10, starts_at = now() - interval '1 day' WHERE id = $1", [a.eventoId]);
    // `semear` cria DOIS eventos. A H1 de plataforma soma expected_guests de
    // todos os eventos da janela, então sem tirar `b` daqui o denominador seria
    // 10 + os convidados de `b`, e a asserção mediria outra coisa.
    await admin.query("UPDATE events SET starts_at = now() - interval '400 days' WHERE id = $1", [b.eventoId]);

    const overview = await getPlatformOverview(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir /console", days: 30 },
    );

    expect(overview.h1.current).toBeCloseTo(1 / 10, 5);
  });
});
