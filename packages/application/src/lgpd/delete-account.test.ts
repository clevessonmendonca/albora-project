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

/** Prazo qualquer: nenhum teste aqui afirma nada sobre prazo legal — quem faz isso é a suíte de DSAR. */
async function pedidoDeExclusao(
  contaId: string,
  over: { kind?: string; status?: string } = {},
): Promise<string> {
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO dsar_requests (kind, subject_account_id, legal_due_at, status)
     VALUES ($1, $2, now() + interval '15 days', $3) RETURNING id`,
    [over.kind ?? "deletion", contaId, over.status ?? "open"],
  );
  return rows[0]!.id;
}

async function statusDoPedido(id: string): Promise<string | null> {
  const { rows } = await admin.query<{ status: string }>("SELECT status FROM dsar_requests WHERE id = $1", [id]);
  return rows[0]?.status ?? null;
}

/**
 * Todo teste que já existia exercitava a purga direto. Agora ela exige um
 * pedido de exclusão aberto, então o pedido é criado aqui — o que cada teste
 * afirma continua sendo o que ele afirmava.
 */
async function excluirComPedido(
  deps: Parameters<typeof deleteAccountOnRequest>[0],
  input: { actor: ReturnType<typeof actor>; reason: string; accountId: string },
): Promise<Awaited<ReturnType<typeof deleteAccountOnRequest>>> {
  const dsarRequestId = await pedidoDeExclusao(input.accountId);
  return deleteAccountOnRequest(deps, { ...input, dsarRequestId });
}

describe("deleteAccountOnRequest", () => {
  it("sem lgpd.delete_account é negado e nada é apagado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    await expect(
      excluirComPedido(
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
      excluirComPedido(
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
      excluirComPedido(
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
      excluirComPedido(
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

    await excluirComPedido(
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

    const resultado = await excluirComPedido(
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

    await excluirComPedido(
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

    await excluirComPedido(
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

  it("sem pedido de exclusão aberto, nada é apagado — excluir conta não apaga direto", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    await expect(
      deleteAccountOnRequest(
        { pool: app },
        {
          actor: actor(["owner"]),
          reason: "tentativa sem pedido",
          accountId: a.contaId,
          dsarRequestId: "00000000-0000-0000-0000-000000000000",
        },
      ),
    ).rejects.toThrow(CommandDeniedError);

    expect(await contaExiste(a.contaId)).toBe(true);
  });

  it("pedido de outro tipo não autoriza purga — acesso não é exclusão", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const pedido = await pedidoDeExclusao(a.contaId, { kind: "access" });

    await expect(
      deleteAccountOnRequest(
        { pool: app },
        { actor: actor(["owner"]), reason: "tipo errado", accountId: a.contaId, dsarRequestId: pedido },
      ),
    ).rejects.toThrow(CommandDeniedError);

    expect(await contaExiste(a.contaId)).toBe(true);
  });

  it("pedido de outra conta não autoriza purga desta", async () => {
    await prepararBanco();
    const { a, b } = await semear(admin);
    const pedidoDeB = await pedidoDeExclusao(b.contaId);

    await expect(
      deleteAccountOnRequest(
        { pool: app },
        { actor: actor(["owner"]), reason: "conta trocada", accountId: a.contaId, dsarRequestId: pedidoDeB },
      ),
    ).rejects.toThrow(CommandDeniedError);

    expect(await contaExiste(a.contaId)).toBe(true);
    expect(await contaExiste(b.contaId)).toBe(true);
  });

  it("pedido já concluído não executa de novo", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const pedido = await pedidoDeExclusao(a.contaId, { status: "completed" });

    await expect(
      deleteAccountOnRequest(
        { pool: app },
        { actor: actor(["owner"]), reason: "reexecução", accountId: a.contaId, dsarRequestId: pedido },
      ),
    ).rejects.toThrow(CommandDeniedError);

    expect(await contaExiste(a.contaId)).toBe(true);
  });

  it("purga leva o pedido junto (cascade), e a prova de atendimento fica na auditoria", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const pedido = await pedidoDeExclusao(a.contaId);

    await deleteAccountOnRequest(
      { pool: app },
      { actor: actor(["owner"]), reason: "titular pediu", accountId: a.contaId, dsarRequestId: pedido },
    );

    expect(await contaExiste(a.contaId)).toBe(false);
    // `subject_account_id` é ON DELETE CASCADE — a linha do pedido não sobrevive
    // à conta. Quem prova o atendimento é o audit_log, que não tem FK para accounts.
    expect(await statusDoPedido(pedido)).toBeNull();

    const { rows } = await admin.query<{ metadata: { dsarRequestId?: string } }>(
      "SELECT metadata FROM audit_log WHERE action = 'lgpd.delete_account' ORDER BY at DESC LIMIT 1",
    );
    expect(rows[0]?.metadata?.dsarRequestId).toBe(pedido);
  });
});
