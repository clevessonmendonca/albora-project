import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@albora/core";
import { prepararBanco } from "@albora/db/testes/banco";
import { executeCommand } from "./command";
import { ApprovalRequiredError, CommandDeniedError, ReauthRequiredError } from "./errors";

let app: pg.Pool;
let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: ["finance"],
    sessionId: "sess-1",
    requestId: "req-1",
    reauthenticatedAt: null,
    ...overrides,
  };
}

describe("executeCommand", () => {
  it("reason vazio rejeita antes de tocar o banco", async () => {
    await expect(
      executeCommand({ pool: app }, {
        actor: actor(), capability: "subscription.refund", reason: "  ",
        target: { kind: "subscription" }, action: "subscription.refund",
        run: async () => { throw new Error("não deveria rodar"); },
      }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("capacidade negada não abre transação", async () => {
    let rodou = false;
    await expect(
      executeCommand({ pool: app }, {
        actor: actor({ roles: ["engineering"] }), capability: "subscription.refund",
        reason: "tentativa sem capacidade", target: { kind: "subscription" }, action: "subscription.refund",
        run: async () => { rodou = true; return null; },
      }),
    ).rejects.toThrow(CommandDeniedError);
    expect(rodou).toBe(false);
  });

  it("needsReauth vira ReauthRequiredError", async () => {
    await expect(
      executeCommand({ pool: app }, {
        actor: actor({ roles: ["compliance"] }), capability: "lgpd.delete_account",
        reason: "pedido do titular", target: { kind: "account" }, action: "lgpd.delete_account",
        run: async () => null,
      }),
    ).rejects.toThrow(ReauthRequiredError);
  });

  // Usa reembolso acima do limiar, nao impersonacao: `impersonate.request`
  // deixou de ter politica (criar o pedido e permitido ao suporte; quem exige
  // aprovacao e ativar a sessao, como invariante do comando). Reembolso e o
  // caso vivo de needsApproval — `finance` tem `subscription.refund` mas nao
  // `subscription.refund.approve`, entao nao aprova o proprio pedido.
  it("needsApproval vira ApprovalRequiredError", async () => {
    await expect(
      executeCommand({ pool: app }, {
        actor: actor({ roles: ["finance"] }), capability: "subscription.refund",
        context: { amountCents: 100_000 },
        reason: "cliente pediu reembolso integral", target: { kind: "subscription" }, action: "subscription.refund",
        run: async () => null,
      }),
    ).rejects.toThrow(ApprovalRequiredError);
  });

  it("caminho feliz grava exatamente uma linha em audit_log", async () => {
    const antes = await app.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'test.happy_path'",
    );
    const resultado = await executeCommand({ pool: app }, {
      actor: actor({ roles: ["finance"], reauthenticatedAt: new Date() }),
      capability: "subscription.mutate",
      reason: "troca de plano solicitada pelo cliente",
      target: { kind: "subscription", id: "sub-42" },
      action: "test.happy_path",
      run: async () => "efeito-aplicado",
    });
    expect(resultado).toBe("efeito-aplicado");
    const depois = await app.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'test.happy_path'",
    );
    expect(Number(depois.rows[0]!.n) - Number(antes.rows[0]!.n)).toBe(1);
  });

  it("auditoria que falha desfaz o efeito de run — prova do rollback", async () => {
    // CREATE TABLE exige privilégio de schema que `albora_app` não tem por
    // desenho (migration 0002: só DML nas tabelas existentes, nunca DDL) —
    // por isso a tabela de scratch nasce pelo pool `admin`, como `semear()`
    // faz em packages/db/src/testes/banco.ts. `run(tx)` abaixo ainda usa a
    // conexão de `app` dentro da transação de `executeCommand`.
    await admin.query("CREATE TABLE IF NOT EXISTS scratch_rollback_marker (id serial PRIMARY KEY, note text)");
    await admin.query("DELETE FROM scratch_rollback_marker");

    await expect(
      executeCommand({ pool: app }, {
        actor: actor({ roles: ["finance"] }),
        capability: "subscription.mutate",
        reason: "marca o efeito e força a auditoria a falhar",
        // target_kind inválido viola o CHECK de audit_log dentro da MESMA
        // transação do INSERT em scratch_rollback_marker — prova que
        // auditoria e efeito de `run` sobem e descem juntos.
        target: { kind: "bogus_target_kind" as never, id: null },
        action: "test.rollback_proof",
        run: async (tx) => {
          await tx.query("INSERT INTO scratch_rollback_marker (note) VALUES ('marcado')");
        },
      }),
    ).rejects.toThrow();

    const { rows } = await app.query<{ n: string }>("SELECT count(*)::text AS n FROM scratch_rollback_marker");
    expect(rows[0]?.n).toBe("0");
  });
});
