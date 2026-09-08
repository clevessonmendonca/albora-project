import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupportTicket, getSupportTicketAdmin } from "@albora/db";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { assignTicket } from "./assign-ticket";

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

async function staffFixture() {
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO staff_users (email, name) VALUES ($1, 'Staff') RETURNING id",
    [`staff-${Math.random().toString(36).slice(2)}@albora.com`],
  );
  return rows[0]!.id;
}

describe("assignTicket", () => {
  it("nega quem não tem tickets.assign e nada muda no banco", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    const staffId = await staffFixture();

    await expect(
      assignTicket({ pool: app }, { actor: actor(["engineering"]), ticketId: ticket.id, assigneeStaffId: staffId }),
    ).rejects.toThrow(CommandDeniedError);

    const depois = await getSupportTicketAdmin(agregador, ticket.id);
    expect(depois?.assigneeStaffId).toBeNull();
  });

  it("atribui usando assignee_staff_id (não assignee_account_id)", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    const staffId = await staffFixture();

    await assignTicket({ pool: app }, { actor: actor(["support"]), ticketId: ticket.id, assigneeStaffId: staffId });

    const depois = await getSupportTicketAdmin(agregador, ticket.id);
    expect(depois?.assigneeStaffId).toBe(staffId);

    const { rows } = await admin.query<{ assignee_account_id: string | null }>(
      "SELECT assignee_account_id FROM support_tickets WHERE id = $1",
      [ticket.id],
    );
    expect(rows[0]?.assignee_account_id).toBeNull();
  });

  it("desatribuir grava audit_log com o alvo do ticket", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    const staffId = await staffFixture();
    await assignTicket({ pool: app }, { actor: actor(["support"]), ticketId: ticket.id, assigneeStaffId: staffId });
    await assignTicket({ pool: app }, { actor: actor(["support"]), ticketId: ticket.id, assigneeStaffId: null });

    const depois = await getSupportTicketAdmin(agregador, ticket.id);
    expect(depois?.assigneeStaffId).toBeNull();

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'tickets.assign' AND target_id = $1",
      [ticket.id],
    );
    expect(Number(rows[0]?.n)).toBe(2);
  });
});
