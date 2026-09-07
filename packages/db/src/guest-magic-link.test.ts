import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { consumeGuestMagicLink, emitGuestMagicLinkRow } from "./guest-magic-link";
import { prepararBanco, semear } from "./testes/banco";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";
const EMAIL = "convidado@exemplo.test";

const daqui = (min: number) => new Date(Date.now() + min * 60 * 1000);

let admin: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

async function contarAccounts(): Promise<number> {
  const { rows } = await admin.query<{ n: string }>("SELECT count(*)::int AS n FROM accounts");
  return Number(rows[0]!.n);
}

describe("guest-magic-link — emit e consume (DB)", () => {
  it("emit→consume devolve {eventId, sessionId, email}", async () => {
    const { token } = await emitGuestMagicLinkRow(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      EMAIL,
      daqui(15),
    );

    const resolvido = await consumeGuestMagicLink(admin, SEGREDO, token);
    expect(resolvido).toEqual({
      eventId: dados.a.eventoId,
      sessionId: dados.a.sessaoId,
      email: EMAIL,
    });
  });

  it("segundo consume do mesmo token devolve null (single-use)", async () => {
    const { token } = await emitGuestMagicLinkRow(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      EMAIL,
      daqui(15),
    );

    const primeiro = await consumeGuestMagicLink(admin, SEGREDO, token);
    expect(primeiro).not.toBeNull();

    const segundo = await consumeGuestMagicLink(admin, SEGREDO, token);
    expect(segundo).toBeNull();
  });

  it("token expirado devolve null", async () => {
    const { token } = await emitGuestMagicLinkRow(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      EMAIL,
      daqui(-1),
    );

    await expect(consumeGuestMagicLink(admin, SEGREDO, token)).resolves.toBeNull();
  });

  it("assinatura forjada devolve null sem tocar o banco", async () => {
    await expect(
      consumeGuestMagicLink(admin, SEGREDO, "forjado.sem-assinatura-valida"),
    ).resolves.toBeNull();
  });

  it("nunca insere em accounts — contagem antes/depois é igual", async () => {
    const antes = await contarAccounts();

    const { token } = await emitGuestMagicLinkRow(
      admin,
      SEGREDO,
      dados.b.eventoId,
      dados.b.sessaoId,
      EMAIL,
      daqui(15),
    );
    await consumeGuestMagicLink(admin, SEGREDO, token);

    const depois = await contarAccounts();
    expect(depois).toBe(antes);
  });
});
