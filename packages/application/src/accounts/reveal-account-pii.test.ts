import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { revealAccountPii } from "./reveal-account-pii";

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

function actor(roles: string[]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

describe("revealAccountPii", () => {
  it("nega quem não tem accounts.pii.reveal", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await expect(
      revealAccountPii({ pool: app }, { actor: actor(["engineering"]), reason: "curiosidade", accountId: a.contaId }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("suporte com motivo revela o e-mail cru e grava audit_log", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const resultado = await revealAccountPii(
      { pool: app },
      { actor: actor(["support"]), reason: "ticket #42 — confirmar e-mail de cobrança", accountId: a.contaId },
    );
    expect(resultado.email).toBe("anfitriao-a@exemplo.test");

    const { rows } = await admin.query(
      "SELECT action, target_kind, target_id, reason FROM audit_log WHERE action = 'accounts.pii.reveal'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].target_kind).toBe("account");
    expect(rows[0].target_id).toBe(a.contaId);
    expect(rows[0].reason).toContain("ticket #42");
  });

  it("motivo vazio nunca chega a revelar nada", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await expect(
      revealAccountPii({ pool: app }, { actor: actor(["support"]), reason: "  ", accountId: a.contaId }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("audit_log não guarda o e-mail revelado no metadata", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await revealAccountPii(
      { pool: app },
      { actor: actor(["support"]), reason: "ticket #43 — checar duplicidade", accountId: a.contaId },
    );

    const { rows } = await admin.query<{ metadata: Record<string, unknown> }>(
      "SELECT metadata FROM audit_log WHERE action = 'accounts.pii.reveal' ORDER BY at DESC LIMIT 1",
    );
    expect(JSON.stringify(rows[0]?.metadata ?? {})).not.toContain("anfitriao-a@exemplo.test");
  });
});
