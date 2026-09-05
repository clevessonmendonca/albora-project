import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { insertAuditLog } from "@albora/db";
import { CommandDeniedError } from "../envelope/errors";
import { getAccount } from "./get-account";

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

function actor(roles: string[] = ["owner"]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

describe("getAccount", () => {
  it("nega quem não tem accounts.read — e a query não roda", async () => {
    // `engineering` é o único papel sem `accounts.read` (packages/core/src/authorization/roles.ts).
    await expect(
      getAccount(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["engineering"]), reason: "abrir conta", accountId: "id" },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("conta inexistente devolve null, não objeto vazio", async () => {
    await prepararBanco();
    const conta = await getAccount(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir conta", accountId: "00000000-0000-0000-0000-000000000000" },
    );
    expect(conta).toBeNull();
  });

  it("conta existente traz identidade, eventos, consentimentos agregados e último login aproximado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const conta = await getAccount(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir conta", accountId: a.contaId },
    );
    expect(conta?.id).toBe(a.contaId);
    expect(conta?.maskedEmail).not.toContain("anfitriao-a@exemplo.test");
    expect(conta?.events).toHaveLength(1);
    expect(conta?.events[0]?.id).toBe(a.eventoId);
    expect(conta?.consentsByVersion.some((c) => c.versao === "v1")).toBe(true);
    // `lastAccessAt` chega marcado como aproximado — a UI não pode tratar como exato.
    expect(conta?.lastAccessAt.approximate).toBe(true);
    expect(conta?.lastAccessAt.approximationBasis).toMatch(/login/);
  });

  it("trilha traz as ações da equipe sobre esta conta, não de outra", async () => {
    await prepararBanco();
    const { a, b } = await semear(admin);
    const client = await app.connect();
    try {
      await insertAuditLog(client, {
        actorKind: "staff",
        actorId: "11111111-1111-1111-1111-111111111111",
        action: "accounts.pii.reveal",
        targetKind: "account",
        targetId: a.contaId,
        reason: "atendimento de suporte",
      });
      await insertAuditLog(client, {
        actorKind: "staff",
        actorId: "11111111-1111-1111-1111-111111111111",
        action: "accounts.pii.reveal",
        targetKind: "account",
        targetId: b.contaId,
        reason: "atendimento de outra conta",
      });
    } finally {
      client.release();
    }

    const conta = await getAccount(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir conta", accountId: a.contaId },
    );
    expect(conta?.auditTrail).toHaveLength(1);
    expect(conta?.auditTrail[0]?.targetId).toBe(a.contaId);
    expect(conta?.auditTrail.some((e) => e.targetId === b.contaId)).toBe(false);
  });

  it("conta sem entrada de auditoria mostra trilha vazia, não erro", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const conta = await getAccount(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir conta", accountId: a.contaId },
    );
    expect(conta?.auditTrail).toEqual([]);
  });
});
