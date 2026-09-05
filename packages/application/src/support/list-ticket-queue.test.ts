import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { createSupportTicket } from "@albora/db";
import { CommandDeniedError } from "../envelope/errors";
import { listTicketQueue } from "./list-ticket-queue";

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

function actor(roles: string[] = ["support"]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

describe("listTicketQueue", () => {
  it("nega quem não tem tickets.read — e a query não roda (compliance não tem a capacidade)", async () => {
    await expect(
      listTicketQueue(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["compliance"]), reason: "abrir fila", limit: 50 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("sem motivo, nega antes de rodar qualquer query", async () => {
    await expect(
      listTicketQueue(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(), reason: "  ", limit: 50 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("devolve a fila ordenada por SLA mais próximo do estouro, não por criação", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const longe = await createSupportTicket(admin, a.contaId, { subject: "p2 antigo", body: "x", priority: "p2" });
    const perto = await createSupportTicket(admin, a.contaId, { subject: "p0 recente", body: "y", priority: "p0" });

    const { rows } = await listTicketQueue(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir fila", statuses: ["open", "pending"], limit: 50 },
    );
    const posicaoPerto = rows.findIndex((t) => t.id === perto.id);
    const posicaoLonge = rows.findIndex((t) => t.id === longe.id);
    expect(posicaoPerto).toBeLessThan(posicaoLonge);
  });
});
