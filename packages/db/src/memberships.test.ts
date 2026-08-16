import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { roleForAccountOnEvent } from "./memberships";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;
let plannerId: string;
let coupleExtraId: string;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);

  const planner = await admin.query<{ id: string }>(
    "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
    ["cerimonialista@exemplo.test"],
  );
  plannerId = planner.rows[0]!.id;

  const couple = await admin.query<{ id: string }>(
    "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
    ["segundo-casal@exemplo.test"],
  );
  coupleExtraId = couple.rows[0]!.id;

  await admin.query(
    `INSERT INTO event_members (event_id, account_id, role) VALUES
       ($1, $2, 'couple'),
       ($1, $3, 'planner'),
       ($1, $4, 'couple')
     ON CONFLICT DO NOTHING`,
    [dados.a.eventoId, dados.a.contaId, plannerId, coupleExtraId],
  );
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("roleForAccountOnEvent", () => {
  it("dona da fatura é owner", async () => {
    expect(await roleForAccountOnEvent(app, dados.a.contaId, dados.a.eventoId)).toBe("owner");
  });

  it("membro planner vê o próprio papel, não o evento alheio", async () => {
    expect(await roleForAccountOnEvent(app, plannerId, dados.a.eventoId)).toBe("planner");
    expect(await roleForAccountOnEvent(app, plannerId, dados.b.eventoId)).toBeNull();
  });

  it("couple que não é account_id do evento continua couple", async () => {
    expect(await roleForAccountOnEvent(app, coupleExtraId, dados.a.eventoId)).toBe("couple");
  });

  it("conta sem vínculo retorna null", async () => {
    expect(await roleForAccountOnEvent(app, dados.b.contaId, dados.a.eventoId)).toBeNull();
  });
});
