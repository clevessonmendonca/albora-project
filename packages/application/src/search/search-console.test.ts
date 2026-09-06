import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { createSupportTicket } from "@albora/db";
import { searchConsole } from "./search-console";

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

describe("searchConsole", () => {
  it("query com menos de 2 caracteres devolve vazio sem tocar o banco", async () => {
    const resultados = await searchConsole(
      { pool: {} as never, aggregatorPool: {} as never },
      { actor: actor(["owner"]), reason: "⌘K", query: "a" },
    );
    expect(resultados).toEqual([]);
  });

  it("engineering tem events.read e tickets.read mas não accounts.read — busca por e-mail não acha a conta", async () => {
    await prepararBanco();
    await semear(admin); // cria a conta que a busca NÃO deve encontrar
    const resultados = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["engineering"]), reason: "⌘K", query: "anfitriao-a" },
    );
    expect(resultados.find((r) => r.kind === "account")).toBeUndefined();
  });

  it("owner encontra a conta pelo e-mail, com link pro detalhe", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const resultados = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "⌘K", query: "anfitriao-a" },
    );
    const conta = resultados.find((r) => r.kind === "account");
    expect(conta?.id).toBe(a.contaId);
    expect(conta?.href).toBe(`/console/accounts/${a.contaId}`);
  });

  it("owner encontra o evento pelo título", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await admin.query("UPDATE events SET title = $2 WHERE id = $1", [a.eventoId, "Casamento Busqueda"]);
    const resultados = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "⌘K", query: "Busqueda" },
    );
    const evento = resultados.find((r) => r.kind === "event");
    expect(evento?.id).toBe(a.eventoId);
    expect(evento?.href).toBe(`/console/events/${a.eventoId}`);
  });

  it("owner encontra o ticket pelo id exato, nunca por texto do assunto", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida sobre cobrança", body: "oi" });

    const porId = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "⌘K", query: ticket.id },
    );
    expect(porId.find((r) => r.kind === "ticket")?.href).toBe(`/console/support?ticket=${ticket.id}`);

    const porAssunto = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "⌘K", query: "cobrança" },
    );
    expect(porAssunto.find((r) => r.kind === "ticket")).toBeUndefined();
  });

  it("compliance tem accounts.read e events.read mas não tickets.read — busca pelo id exato do ticket não acha nada", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida sobre cobrança", body: "oi" });

    const resultados = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["compliance"]), reason: "⌘K", query: ticket.id },
    );
    expect(resultados.find((r) => r.kind === "ticket")).toBeUndefined();
  });
});
