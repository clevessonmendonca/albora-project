import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError, ReauthRequiredError } from "../envelope/errors";
import { deleteAccountOnRequest } from "./delete-account";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

function actor(roles: string[], reauthenticatedAt: Date | null = new Date()) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt,
  };
}

async function contaExiste(contaId: string): Promise<boolean> {
  const { rows } = await admin.query("SELECT 1 FROM accounts WHERE id = $1", [contaId]);
  return rows.length > 0;
}

describe("deleteAccountOnRequest", () => {
  it("sem lgpd.delete_account é negado e nada é apagado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    await expect(
      deleteAccountOnRequest(
        { pool: app },
        { actor: actor(["support"]), reason: "pedido do titular", accountId: a.contaId },
      ),
    ).rejects.toThrow(CommandDeniedError);

    expect(await contaExiste(a.contaId)).toBe(true);
  });

  it("sem reautenticação recente, sempre needsReauth — nem chega a tocar o banco", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    await expect(
      deleteAccountOnRequest(
        { pool: app },
        { actor: actor(["compliance"], null), reason: "pedido do titular", accountId: a.contaId },
      ),
    ).rejects.toThrow(ReauthRequiredError);

    expect(await contaExiste(a.contaId)).toBe(true);
  });

  it("owner também cai em needsReauth — papel dá capacidade, política dá circunstância", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    await expect(
      deleteAccountOnRequest(
        { pool: app },
        { actor: actor(["owner"], null), reason: "pedido do titular", accountId: a.contaId },
      ),
    ).rejects.toThrow(ReauthRequiredError);

    expect(await contaExiste(a.contaId)).toBe(true);
  });

  it("falha no purge (privilégio revogado) não marca a conta como excluída — fail-closed, nada de banco é commitado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    // Simula uma falha real de purge (bytes/ponteiros): sem UPDATE em
    // uploads, `purgarAcervo` estoura no meio da transação.
    await admin.query("REVOKE UPDATE ON uploads FROM albora_app");

    await expect(
      deleteAccountOnRequest(
        { pool: app },
        { actor: actor(["compliance"]), reason: "pedido do titular", accountId: a.contaId },
      ),
    ).rejects.toThrow();

    expect(await contaExiste(a.contaId)).toBe(true);
    const { rows: eventoDepois } = await admin.query("SELECT 1 FROM events WHERE id = $1", [a.eventoId]);
    expect(eventoDepois).toHaveLength(1);
    const { rows: auditoria } = await admin.query(
      "SELECT 1 FROM audit_log WHERE action = 'lgpd.delete_account' AND target_id = $1",
      [a.contaId],
    );
    expect(auditoria).toHaveLength(0);
  });

  it("com reautenticação recente, exclui de fato conta e eventos, e grava exatamente uma linha em audit_log", async () => {
    await prepararBanco();
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ('excluir-pedido@exemplo.test') RETURNING id");
    const contaId = rows[0].id as string;

    await deleteAccountOnRequest(
      { pool: app },
      { actor: actor(["compliance"]), reason: "pedido do titular via e-mail", accountId: contaId },
    );

    expect(await contaExiste(contaId)).toBe(false);
    const { rows: auditoria } = await admin.query(
      "SELECT * FROM audit_log WHERE action = 'lgpd.delete_account' AND target_id = $1",
      [contaId],
    );
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0].reason).toBe("pedido do titular via e-mail");
  });

  it("enfileira as keys do R2 em account_purge_jobs como pending — a fila durável do purge de bytes pós-commit", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    const resultado = await deleteAccountOnRequest(
      { pool: app },
      { actor: actor(["compliance"]), reason: "pedido do titular", accountId: a.contaId },
    );

    expect(resultado.keysToDelete).toEqual([`events/${a.eventoId}/2026/08/foto/full`]);
    expect(resultado.purgeJobIds).toHaveLength(1);

    const { rows } = await admin.query(
      "SELECT storage_key, status FROM account_purge_jobs WHERE account_id = $1",
      [a.contaId],
    );
    expect(rows).toEqual([{ storage_key: `events/${a.eventoId}/2026/08/foto/full`, status: "pending" }]);
  });

  it("a linha de auditoria continua existindo depois da conta apagada — audit_log não tem FK para accounts", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    await deleteAccountOnRequest(
      { pool: app },
      { actor: actor(["compliance"]), reason: "pedido do titular", accountId: a.contaId },
    );

    expect(await contaExiste(a.contaId)).toBe(false);
    const { rows: auditoria } = await admin.query(
      "SELECT target_id FROM audit_log WHERE action = 'lgpd.delete_account' AND target_id = $1",
      [a.contaId],
    );
    expect(auditoria).toHaveLength(1);
  });

  it("metadata da auditoria não guarda e-mail nem nome do titular", async () => {
    await prepararBanco();
    const { rows } = await admin.query(
      "INSERT INTO accounts (email) VALUES ('joao.titular@exemplo.test') RETURNING id",
    );
    const contaId = rows[0].id as string;

    await deleteAccountOnRequest(
      { pool: app },
      { actor: actor(["compliance"]), reason: "pedido do titular joão — protocolo #99", accountId: contaId },
    );

    const { rows: auditoria } = await admin.query<{ metadata: Record<string, unknown> }>(
      "SELECT metadata FROM audit_log WHERE action = 'lgpd.delete_account' AND target_id = $1",
      [contaId],
    );
    expect(JSON.stringify(auditoria[0]?.metadata ?? {})).not.toContain("joao.titular@exemplo.test");
    expect(JSON.stringify(auditoria[0]?.metadata ?? {})).not.toContain("joão");
  });
});
