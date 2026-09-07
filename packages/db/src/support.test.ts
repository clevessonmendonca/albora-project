import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "./testes/banco";
import {
  assignSupportTicketOnClient,
  createSupportTicket,
  getSupportTicketAdmin,
  listSupportMessagesAdmin,
  listSupportTicketsQueueAdmin,
  respondSupportTicketOnClient,
  updateSupportTicketPriorityOnClient,
  updateSupportTicketStatusOnClient,
} from "./support";

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

async function staffFixture() {
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO staff_users (email, name) VALUES ($1, 'Staff') RETURNING id",
    [`staff-${Math.random().toString(36).slice(2)}@albora.com`],
  );
  return rows[0]!.id;
}

/** Escrita de staff sem `app.staff_command` é bloqueada pela RLS — prova negativa antes da prova positiva. */
async function comMarcador<T>(marcado: boolean, executar: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await app.connect();
  try {
    await client.query("BEGIN");
    if (marcado) await client.query("SELECT set_config('app.staff_command', 'true', true)");
    const resultado = await executar(client);
    await client.query("COMMIT");
    return resultado;
  } finally {
    client.release();
  }
}

describe("mutações de staff em support_tickets", () => {
  it("sem app.staff_command, a atribuição não afeta nenhuma linha (RLS fecha, não erra)", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    const staffId = await staffFixture();

    await comMarcador(false, (client) => assignSupportTicketOnClient(client, { ticketId: ticket.id, staffId }));

    const depois = await getSupportTicketAdmin(agregador, ticket.id);
    expect(depois?.assigneeStaffId).toBeNull();
  });

  it("com app.staff_command, atribuir/responder/mudar status e prioridade funcionam", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi", priority: "p2" });
    const staffId = await staffFixture();

    await comMarcador(true, (client) => assignSupportTicketOnClient(client, { ticketId: ticket.id, staffId }));
    await comMarcador(true, (client) =>
      respondSupportTicketOnClient(client, { ticketId: ticket.id, staffId, body: "já estou vendo" }),
    );
    await comMarcador(true, (client) => updateSupportTicketStatusOnClient(client, { ticketId: ticket.id, status: "pending" }));
    const antesPrioridade = await getSupportTicketAdmin(agregador, ticket.id);
    await comMarcador(true, (client) => updateSupportTicketPriorityOnClient(client, { ticketId: ticket.id, priority: "p0" }));

    const final = await getSupportTicketAdmin(agregador, ticket.id);
    expect(final?.assigneeStaffId).toBe(staffId);
    expect(final?.status).toBe("pending");
    expect(final?.priority).toBe("p0");
    // p0 = SLA de 15min — recomputado a partir de AGORA na troca de prioridade, não da criação do ticket.
    expect(final!.slaDueAt!.getTime()).toBeLessThan(antesPrioridade!.slaDueAt!.getTime());

    const mensagens = await listSupportMessagesAdmin(agregador, ticket.id);
    const daEquipe = mensagens.find((m) => m.authorKind === "operator");
    expect(daEquipe?.authorStaffId).toBe(staffId);
    expect(daEquipe?.body).toBe("já estou vendo");
  });
});

describe("listSupportTicketsQueueAdmin", () => {
  it("ordena por sla_due_at mais próximo primeiro, ignorando criação/prioridade", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const longe = await createSupportTicket(admin, a.contaId, { subject: "p2 antigo", body: "x", priority: "p2" });
    const perto = await createSupportTicket(admin, a.contaId, { subject: "p0 recente", body: "y", priority: "p0" });

    const fila = await listSupportTicketsQueueAdmin(agregador, { statuses: ["open", "pending"], limit: 50 });
    const posicaoPerto = fila.rows.findIndex((t) => t.id === perto.id);
    const posicaoLonge = fila.rows.findIndex((t) => t.id === longe.id);
    expect(posicaoPerto).toBeLessThan(posicaoLonge);
  });

  it("filtro por assigneeStaffId reflete no resultado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "x" });
    const { rows: staff } = await admin.query<{ id: string }>(
      "INSERT INTO staff_users (email, name) VALUES ('resp@albora.com', 'Resp') RETURNING id",
    );
    await admin.query("UPDATE support_tickets SET assignee_staff_id = $2 WHERE id = $1", [ticket.id, staff[0]!.id]);

    const comFiltro = await listSupportTicketsQueueAdmin(agregador, { assigneeStaffId: staff[0]!.id, limit: 50 });
    expect(comFiltro.rows.map((t) => t.id)).toEqual([ticket.id]);
  });
});
