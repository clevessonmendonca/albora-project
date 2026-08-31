import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  consumirMagicLink,
  emitirMagicLink,
  ErroHostSessaoInvalida,
  ErroMagicLinkInvalido,
  resolverHostSessao,
  revogarHostSessao,
} from "./host-auth";
import { prepararBanco } from "./testes/banco";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";
const OUTRO = "outro-segredo-de-teste-com-mais-de-32-chars";
const daqui = (min: number) => new Date(Date.now() + min * 60 * 1000);

let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

describe("o anfitrião entra por magic link", () => {
  it("emite, consome e a sessão resolve a conta com o e-mail", async () => {
    const { token, accountId } = await emitirMagicLink(admin, SEGREDO, "Ana@Exemplo.com", daqui(15));

    const sessao = await consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date());
    expect(sessao.accountId).toBe(accountId);

    const host = await resolverHostSessao(admin, SEGREDO, sessao.token);
    // E-mail normalizado em minúsculas na criação da conta.
    expect(host).toEqual({ accountId, email: "ana@exemplo.com" });
  });

  it("a mesma conta reusa o account_id em vez de duplicar", async () => {
    const a = await emitirMagicLink(admin, SEGREDO, "bia@exemplo.com", daqui(15));
    const b = await emitirMagicLink(admin, SEGREDO, "bia@exemplo.com", daqui(15));
    expect(a.accountId).toBe(b.accountId);
  });

  it("guarda o hash, nunca o token", async () => {
    const { token } = await emitirMagicLink(admin, SEGREDO, "cadu@exemplo.com", daqui(15));
    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM magic_links WHERE encode(token_hash, 'hex') = $1",
      [token],
    );
    expect(rows[0]?.n).toBe("0");
  });
});

describe("o magic link é de uso único e vida curta", () => {
  it("consumir duas vezes falha na segunda", async () => {
    const { token } = await emitirMagicLink(admin, SEGREDO, "duo@exemplo.com", daqui(15));
    await consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date());
    await expect(
      consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date()),
    ).rejects.toMatchObject({ motivo: "ja_usado" });
  });

  it("dois cliques simultâneos abrem uma sessão só", async () => {
    const { token } = await emitirMagicLink(admin, SEGREDO, "corrida@exemplo.com", daqui(15));
    const [a, b] = await Promise.allSettled([
      consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date()),
      consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date()),
    ]);
    const ok = [a, b].filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
  });

  it("link expirado é recusado", async () => {
    const { token } = await emitirMagicLink(admin, SEGREDO, "velho@exemplo.com", daqui(-1));
    await expect(
      consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date()),
    ).rejects.toMatchObject({ motivo: "expirado" });
  });

  it("link assinado com outro segredo é recusado antes do banco", async () => {
    const { token } = await emitirMagicLink(admin, OUTRO, "forjado@exemplo.com", daqui(15));
    await expect(
      consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date()),
    ).rejects.toMatchObject({ motivo: "assinatura" });
  });
});

describe("a sessão de host é revogável", () => {
  it("depois de sair, a sessão não resolve mais", async () => {
    const { token } = await emitirMagicLink(admin, SEGREDO, "sai@exemplo.com", daqui(15));
    const sessao = await consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date());

    await revogarHostSessao(admin, SEGREDO, sessao.token);

    await expect(resolverHostSessao(admin, SEGREDO, sessao.token)).rejects.toBeInstanceOf(
      ErroHostSessaoInvalida,
    );
  });

  it("token de sessão desconhecido é recusado", async () => {
    const { token } = await import("./token").then((m) => m.emitirToken(SEGREDO));
    await expect(resolverHostSessao(admin, SEGREDO, token)).rejects.toMatchObject({
      motivo: "desconhecida",
    });
  });

  it("magic link desconhecido é recusado", async () => {
    const { token } = await import("./token").then((m) => m.emitirToken(SEGREDO));
    await expect(
      consumirMagicLink(admin, SEGREDO, token, daqui(720), new Date()),
    ).rejects.toBeInstanceOf(ErroMagicLinkInvalido);
  });
});
