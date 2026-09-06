import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { approveImpersonation } from "./approve-impersonation";
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

async function pedidoAprovado(supportId: string, ownerId: string, contaId: string) {
  const pedido = await requestImpersonation(
    { pool: app },
    { actor: actor(supportId, ["support"]), reason: "ticket", targetAccountId: contaId },
  );
  return approveImpersonation({ pool: app }, { actor: actor(ownerId, ["owner"]), reason: "ok", requestId: pedido.id });
}

describe("startImpersonation", () => {
  it("pedido approved inicia com sucesso — active, host token emitido e marcado", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const aprovado = await pedidoAprovado(supportId, ownerId, contaId);

    const resultado = await startImpersonation(
      { pool: app, sessionSecret: SESSION_SECRET },
      { actor: actor(supportId, ["support"]), reason: "entrando agora", requestId: aprovado.id },
    );

    expect(resultado.request.status).toBe("active");
    expect(resultado.request.startedAt).not.toBeNull();
    expect(typeof resultado.hostToken).toBe("string");
    expect(resultado.hostToken.length).toBeGreaterThan(0);

    const { rows } = await admin.query(
      "SELECT account_id, impersonation_id FROM host_sessions WHERE impersonation_id = $1",
      [aprovado.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].account_id).toBe(contaId);
  });

  it("iniciar duas vezes o mesmo pedido falha — uso único", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const aprovado = await pedidoAprovado(supportId, ownerId, contaId);

    await startImpersonation(
      { pool: app, sessionSecret: SESSION_SECRET },
      { actor: actor(supportId, ["support"]), reason: "primeira entrada", requestId: aprovado.id },
    );

    await expect(
      startImpersonation(
        { pool: app, sessionSecret: SESSION_SECRET },
        { actor: actor(supportId, ["support"]), reason: "segunda tentativa", requestId: aprovado.id },
      ),
    ).rejects.toThrow();

    const { rows } = await admin.query("SELECT 1 FROM host_sessions WHERE impersonation_id = $1", [aprovado.id]);
    expect(rows).toHaveLength(1);
  });

  it("pedido pending (não aprovado) não inicia", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const contaId = await contaFixture();
    const pedido = await requestImpersonation(
      { pool: app },
      { actor: actor(supportId, ["support"]), reason: "ticket", targetAccountId: contaId },
    );

    await expect(
      startImpersonation(
        { pool: app, sessionSecret: SESSION_SECRET },
        { actor: actor(supportId, ["support"]), reason: "tentando sem aprovação", requestId: pedido.id },
      ),
    ).rejects.toThrow();
  });

  it("pedido expirado não inicia — TTL calculado relativo a agora, nunca literal", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const aprovado = await pedidoAprovado(supportId, ownerId, contaId);

    // Só o TTL é forçado pro passado (relativo a `now()` no momento do teste) — não literal.
    await admin.query("UPDATE impersonation_requests SET expires_at = now() - interval '1 minute' WHERE id = $1", [
      aprovado.id,
    ]);

    await expect(
      startImpersonation(
        { pool: app, sessionSecret: SESSION_SECRET },
        { actor: actor(supportId, ["support"]), reason: "tarde demais", requestId: aprovado.id },
      ),
    ).rejects.toThrow();

    const { rows } = await admin.query("SELECT status FROM impersonation_requests WHERE id = $1", [aprovado.id]);
    expect(rows[0].status).toBe("approved");
  });

  it("outro staff (não o requester) não pode iniciar o pedido de alguém", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const outroSupportId = await staffFixo("Outro Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const aprovado = await pedidoAprovado(supportId, ownerId, contaId);

    await expect(
      startImpersonation(
        { pool: app, sessionSecret: SESSION_SECRET },
        { actor: actor(outroSupportId, ["support"]), reason: "tentando assumir", requestId: aprovado.id },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("grava a transição de início na auditoria", async () => {
    await prepararBanco();
    const supportId = await staffFixo("Suporte");
    const ownerId = await staffFixo("Dono");
    const contaId = await contaFixture();
    const aprovado = await pedidoAprovado(supportId, ownerId, contaId);

    await startImpersonation(
      { pool: app, sessionSecret: SESSION_SECRET },
      { actor: actor(supportId, ["support"]), reason: "entrando", requestId: aprovado.id },
    );

    const { rows } = await admin.query(
      "SELECT 1 FROM audit_log WHERE action = 'impersonate.start' AND target_kind = 'impersonation_request' AND target_id = $1",
      [aprovado.id],
    );
    expect(rows).toHaveLength(1);
  });
});
