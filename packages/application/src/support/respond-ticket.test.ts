import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupportTicket, listSupportMessagesAdmin } from "@albora/db";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { respondTicket } from "./respond-ticket";

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

const STAFF_ID_FIXO = "11111111-1111-1111-1111-111111111111";

function actor(roles: string[]) {
  return { staffUserId: STAFF_ID_FIXO, roles: roles as never, sessionId: "s", requestId: "r", reauthenticatedAt: null };
}

/** author_staff_id (migration 0063) tem FK real pra staff_users — o actor de teste precisa de uma linha correspondente. */
async function semearStaffFixo() {
  await admin.query("INSERT INTO staff_users (id, email, name) VALUES ($1, 'staff-fixo@albora.com', 'Staff Fixo')", [
    STAFF_ID_FIXO,
  ]);
}

describe("respondTicket", () => {
  it("nega quem não tem tickets.write e nada muda no banco", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    await expect(
      respondTicket({ pool: app }, { actor: actor(["engineering"]), ticketId: ticket.id, body: "resposta" }),
    ).rejects.toThrow(CommandDeniedError);

    const mensagens = await listSupportMessagesAdmin(agregador, ticket.id);
    expect(mensagens.find((m) => m.authorKind === "operator")).toBeUndefined();
  });

  it("suporte responde e a mensagem carrega o staff autor", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await semearStaffFixo();
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    const resultado = await respondTicket({ pool: app }, { actor: actor(["support"]), ticketId: ticket.id, body: "resposta" });
    expect(resultado.authorKind).toBe("operator");
    expect(resultado.authorStaffId).toBe(STAFF_ID_FIXO);
  });

  it("grava audit_log na mesma transação e o metadata não contém o corpo da mensagem", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await semearStaffFixo();
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    const corpo = "conteúdo sensível do cliente que não pode vazar pra auditoria";
    await respondTicket({ pool: app }, { actor: actor(["support"]), ticketId: ticket.id, body: corpo });

    const { rows } = await admin.query<{ metadata: Record<string, unknown>; target_id: string }>(
      "SELECT metadata, target_id FROM audit_log WHERE action = 'tickets.respond' ORDER BY at DESC LIMIT 1",
    );
    expect(rows[0]?.target_id).toBe(ticket.id);
    expect(JSON.stringify(rows[0]?.metadata ?? {})).not.toContain(corpo);

    const mensagens = await listSupportMessagesAdmin(agregador, ticket.id);
    expect(mensagens.find((m) => m.authorKind === "operator")?.body).toBe(corpo);
  });
});
