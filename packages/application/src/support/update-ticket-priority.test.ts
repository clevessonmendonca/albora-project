import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupportTicket, getSupportTicketAdmin } from "@albora/db";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { updateTicketPriority } from "./update-ticket-priority";

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

describe("updateTicketPriority", () => {
  it("nega quem não tem tickets.write e nada muda no banco", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi", priority: "p2" });

    await expect(
      updateTicketPriority({ pool: app }, { actor: actor(["engineering"]), ticketId: ticket.id, priority: "p0" }),
    ).rejects.toThrow(CommandDeniedError);

    const depois = await getSupportTicketAdmin(agregador, ticket.id);
    expect(depois?.priority).toBe("p2");
  });

  it("muda a prioridade e recalcula sla_due_at a partir de agora (p0 = 15min, reabre a janela)", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi", priority: "p2" });
    const antes = await getSupportTicketAdmin(agregador, ticket.id);

    const antesDaMudanca = Date.now();
    await updateTicketPriority({ pool: app }, { actor: actor(["support"]), ticketId: ticket.id, priority: "p0" });
    const depois = await getSupportTicketAdmin(agregador, ticket.id);

    expect(depois?.priority).toBe("p0");
    // p2 originalmente vencia em ~24h da criação; p0 vence em ~15min de AGORA — bem antes do prazo antigo.
    expect(depois!.slaDueAt!.getTime()).toBeLessThan(antes!.slaDueAt!.getTime());
    expect(depois!.slaDueAt!.getTime()).toBeGreaterThanOrEqual(antesDaMudanca);
    expect(depois!.slaDueAt!.getTime()).toBeLessThanOrEqual(antesDaMudanca + 16 * 60 * 1000);

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'tickets.priority.change' AND target_id = $1",
      [ticket.id],
    );
    expect(Number(rows[0]?.n)).toBe(1);
  });
});
