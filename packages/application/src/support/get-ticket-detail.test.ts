import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { createSupportTicket } from "@albora/db";
import { CommandDeniedError } from "../envelope/errors";
import { getTicketDetail } from "./get-ticket-detail";

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

describe("getTicketDetail", () => {
  it("nega quem não tem tickets.read — e a query não roda (compliance não tem a capacidade)", async () => {
    await expect(
      getTicketDetail(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["compliance"]), reason: "abrir ticket", ticketId: "id" },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("ticket inexistente devolve null, não objeto vazio", async () => {
    await prepararBanco();
    const detalhe = await getTicketDetail(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir ticket", ticketId: "00000000-0000-0000-0000-000000000000" },
    );
    expect(detalhe).toBeNull();
  });

  it("ticket existente traz mensagens e contexto do cliente com e-mail mascarado, sem pagamentos", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });

    const detalhe = await getTicketDetail(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir ticket", ticketId: ticket.id },
    );
    expect(detalhe?.ticket.id).toBe(ticket.id);
    expect(detalhe?.messages).toHaveLength(1);
    expect(detalhe?.customerContext.maskedEmail).not.toContain("anfitriao-a@exemplo.test");
    expect(detalhe?.customerContext.events).toHaveLength(1);
    expect(detalhe?.customerContext.recentPayments).toEqual([]);
  });
});
