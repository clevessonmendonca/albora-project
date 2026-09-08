import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupportTicket, getSupportTicketAdmin } from "@albora/db";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { updateTicketStatus } from "./update-ticket-status";

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
  return { staffUserId: "11111111-1111-1111-1111-111111111111", roles: roles as never, sessionId: "s", requestId: "r", reauthenticatedAt: null };
}

describe("updateTicketStatus", () => {
  it("nega quem não tem tickets.write e nada muda no banco", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });

    await expect(
      updateTicketStatus({ pool: app }, { actor: actor(["engineering"]), ticketId: ticket.id, status: "resolved" }),
    ).rejects.toThrow(CommandDeniedError);

    const depois = await getSupportTicketAdmin(agregador, ticket.id);
    expect(depois?.status).toBe("open");
  });

  it("suporte muda o status e a mutação é auditada", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });

    await updateTicketStatus({ pool: app }, { actor: actor(["support"]), ticketId: ticket.id, status: "resolved" });

    const depois = await getSupportTicketAdmin(agregador, ticket.id);
    expect(depois?.status).toBe("resolved");

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'tickets.status.change' AND target_id = $1",
      [ticket.id],
    );
    expect(Number(rows[0]?.n)).toBe(1);
  });
});
