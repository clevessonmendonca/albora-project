import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { approveImpersonation } from "./approve-impersonation";
import { endImpersonation } from "./end-impersonation";
import { requestImpersonation } from "./request-impersonation";
import { startImpersonation } from "./start-impersonation";

let admin: pg.Pool;
let app: pg.Pool;

const SESSION_SECRET = "segredo-de-teste-com-mais-de-32-caracteres";

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

function actor(staffUserId: string, roles: string[]) {
  return { staffUserId, roles: roles as never, sessionId: "s", requestId: "r", reauthenticatedAt: null };
}

async function staffFixo(nome: string): Promise<string> {
  const id = randomUUID();
  await admin.query("INSERT INTO staff_users (id, email, name) VALUES ($1, $2, $3)", [
    id,
    `${nome}-${id.slice(0, 8)}@albora.com`,
    nome,
  ]);
  return id;
}

async function contaFixture(): Promise<string> {
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${Math.random().toString(36).slice(2)}@exemplo.test`,
  ]);
  return rows[0].id as string;
}

async function pedidoAtivo(supportId: string, ownerId: string, contaId: string) {
  const pedido = await requestImpersonation(
    { pool: app },
    { actor: actor(supportId, ["support"]), reason: "ticket", targetAccountId: contaId },
  );
  await approveImpersonation({ pool: app }, { actor: actor(ownerId, ["owner"]), reason: "ok", requestId: pedido.id });
  return startImpersonation(
    { pool: app, sessionSecret: SESSION_SECRET },
    { actor: actor(supportId, ["support"]), reason: "entrando", requestId: pedido.id },
  );
}

describe("endImpersonation", () => {
  it("marca ended_at e revoga a sessão de host marcada", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const { request } = await pedidoAtivo(supportId, ownerId, contaId);

    const encerrado = await endImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "atendimento concluído", requestId: request.id },
    );

    expect(encerrado.status).toBe("ended");
    expect(encerrado.endedAt).not.toBeNull();

    const { rows } = await admin.query<{ revoked_at: Date | null }>(
      "SELECT revoked_at FROM host_sessions WHERE impersonation_id = $1",
      [request.id],
    );
    expect(rows[0]?.revoked_at).not.toBeNull();
  });

  it("quem aprovou também pode encerrar a sessão de outro staff", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const { request } = await pedidoAtivo(supportId, ownerId, contaId);

    const encerrado = await endImpersonation(
      { pool: app },
      { actor: actor(ownerId, ["owner"]), reason: "encerrando por precaução", requestId: request.id },
    );

    expect(encerrado.status).toBe("ended");
  });

  it("um terceiro staff (nem requester nem approver) não pode encerrar", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const outroId = await staffFixo("Terceiro");
    const contaId = await contaFixture();
    const { request } = await pedidoAtivo(supportId, ownerId, contaId);

    await expect(
      endImpersonation(
        { pool: app },
        { actor: actor(outroId, ["support"]), reason: "curiosidade", requestId: request.id },
      ),
    ).rejects.toThrow(CommandDeniedError);

    const { rows } = await admin.query<{ revoked_at: Date | null }>(
      "SELECT revoked_at FROM host_sessions WHERE impersonation_id = $1",
      [request.id],
    );
    expect(rows[0]?.revoked_at).toBeNull();
  });

  it("grava a transição de encerramento na auditoria — trilha completa request -> approve -> start -> end", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const { request } = await pedidoAtivo(supportId, ownerId, contaId);

    await endImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "fim do atendimento", requestId: request.id },
    );

    const { rows } = await admin.query(
      "SELECT action FROM audit_log WHERE target_kind = 'impersonation_request' AND target_id = $1 ORDER BY at ASC",
      [request.id],
    );
    expect(rows.map((r) => r.action)).toEqual([
      "impersonate.request",
      "impersonate.approve",
      "impersonate.start",
      "impersonate.end",
    ]);
  });
});
