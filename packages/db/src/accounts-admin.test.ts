import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAccountDetailAdmin, getRawAccountContact, listAccountsAdmin } from "./accounts-admin";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await agregador?.end();
});

describe("listAccountsAdmin", () => {
  // `semear(admin)` insere contas com e-mail FIXO — só roda uma vez por banco
  // preparado. Toda vez que este describe semeia em mais de um `it()`,
  // `prepararBanco()` roda de novo antes, senão o segundo `semear` estoura
  // `accounts_email_key` contra o que o primeiro já inseriu.
  it("conta com evento aparece como anfitrião, com contagem de eventos", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const { rows } = await listAccountsAdmin(agregador, { limit: 20 });
    const conta = rows.find((r) => r.id === a.contaId);
    expect(conta?.type).toBe("host");
    expect(conta?.eventCount).toBe(1);
  });

  it("e-mail vem mascarado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const { rows } = await listAccountsAdmin(agregador, { limit: 20 });
    const conta = rows.find((r) => r.id === a.contaId);
    expect(conta?.maskedEmail).toMatch(/^.{1,2}•+@/);
    expect(conta?.maskedEmail).not.toContain("anfitriao-a@exemplo.test");
  });

  it("anfitrião sem coluna de status própria aparece sempre como 'active'", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const { rows } = await listAccountsAdmin(agregador, { limit: 20 });
    const conta = rows.find((r) => r.id === a.contaId);
    expect(conta?.status).toBe("active");
  });

  it("cursor devolve página seguinte sem repetir linha", async () => {
    await prepararBanco();
    await semear(admin);
    const primeira = await listAccountsAdmin(agregador, { limit: 1 });
    expect(primeira.nextCursor).not.toBeNull();
    const segunda = await listAccountsAdmin(agregador, { limit: 1, cursor: primeira.nextCursor! });
    expect(segunda.rows[0]?.id).not.toBe(primeira.rows[0]?.id);
  });

  it("filtro de tipo entra no WHERE — contagem e cursor refletem só o conjunto filtrado", async () => {
    await prepararBanco();
    await semear(admin); // dois anfitriões, nenhum fornecedor
    const { rows, nextCursor } = await listAccountsAdmin(agregador, { limit: 20, type: "vendor" });
    expect(rows).toHaveLength(0);
    expect(nextCursor).toBeNull();
  });

  it("filtro de busca por e-mail cru filtra no servidor sem expor o e-mail na resposta", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const { rows } = await listAccountsAdmin(agregador, { limit: 20, search: "anfitriao-a" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(a.contaId);
    expect(rows[0]?.maskedEmail).not.toContain("anfitriao-a@exemplo.test");
  });
});

describe("getAccountDetailAdmin", () => {
  it("conta inexistente devolve null", async () => {
    await prepararBanco();
    const detalhe = await getAccountDetailAdmin(agregador, "00000000-0000-0000-0000-000000000000");
    expect(detalhe).toBeNull();
  });

  it("conta existente traz eventos e consentimentos agregados, sem nome de convidado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const detalhe = await getAccountDetailAdmin(agregador, a.contaId);
    expect(detalhe?.events).toHaveLength(1);
    expect(detalhe?.events[0]?.id).toBe(a.eventoId);
    expect(detalhe?.consentsByVersion.some((c) => c.versao === "v1")).toBe(true);
    expect(JSON.stringify(detalhe?.consentsByVersion)).not.toContain("convidado-evento-a");
  });

  it("e-mail vem mascarado no detalhe, igual à listagem", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const detalhe = await getAccountDetailAdmin(agregador, a.contaId);
    expect(detalhe?.maskedEmail).toMatch(/^.{1,2}•+@/);
    expect(detalhe?.maskedEmail).not.toContain("anfitriao-a@exemplo.test");
  });

  it("conta de evento B não vaza consentimento de A (isolamento por event_id, ADR 0013)", async () => {
    await prepararBanco();
    const { a, b } = await semear(admin);
    const detalheA = await getAccountDetailAdmin(agregador, a.contaId);
    const detalheB = await getAccountDetailAdmin(agregador, b.contaId);
    expect(detalheA?.events.map((e) => e.id)).not.toContain(b.eventoId);
    expect(detalheB?.events.map((e) => e.id)).not.toContain(a.eventoId);
  });
});

describe("getRawAccountContact", () => {
  it("devolve o e-mail cru, não mascarado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const contato = await getRawAccountContact(agregador, a.contaId);
    expect(contato?.email).toBe("anfitriao-a@exemplo.test");
  });

  it("conta inexistente devolve null", async () => {
    await prepararBanco();
    const contato = await getRawAccountContact(agregador, "00000000-0000-0000-0000-000000000000");
    expect(contato).toBeNull();
  });
});
