import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  autorizarPareamento,
  criarPareamento,
  ErroAutorizacaoDePareamento,
  finalizarPareamento,
} from "./pareamento";
import { resolverParede } from "./parede";
import { prepararBanco, semear } from "./testes/banco";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";

const daqui = (min: number) => new Date(Date.now() + min * 60 * 1000);

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("o telão pareia sem ninguém logado nele", () => {
  it("cria, autoriza pelo evento de quem autoriza, e a TV recebe um crachá daquele evento", async () => {
    const { code, pollToken } = await criarPareamento(app, SEGREDO, daqui(10));

    // Antes de autorizar, o poll não entrega nada.
    expect(await finalizarPareamento(app, SEGREDO, pollToken, daqui(720), new Date())).toEqual({
      status: "pendente",
    });

    await autorizarPareamento(app, code, dados.a.eventoId, "1", new Date());

    const pronto = await finalizarPareamento(app, SEGREDO, pollToken, daqui(720), new Date());
    expect(pronto.status).toBe("pronto");
    if (pronto.status !== "pronto") throw new Error("inalcançável");
    expect(pronto.eventoId).toBe(dados.a.eventoId);

    // O crachá entregue resolve o evento de quem autorizou.
    expect(await resolverParede(app, SEGREDO, pronto.cracha)).toEqual({
      eventoId: dados.a.eventoId,
    });
  });

  it("consome uma vez só: o segundo poll não emite um segundo crachá", async () => {
    const { code, pollToken } = await criarPareamento(app, SEGREDO, daqui(10));
    await autorizarPareamento(app, code, dados.a.eventoId, "1", new Date());

    const primeiro = await finalizarPareamento(app, SEGREDO, pollToken, daqui(720), new Date());
    expect(primeiro.status).toBe("pronto");

    const segundo = await finalizarPareamento(app, SEGREDO, pollToken, daqui(720), new Date());
    expect(segundo.status).toBe("expirado");
  });

  it("dois polls simultâneos não emitem dois crachás", async () => {
    const { code, pollToken } = await criarPareamento(app, SEGREDO, daqui(10));
    await autorizarPareamento(app, code, dados.a.eventoId, "1", new Date());

    const [a, b] = await Promise.all([
      finalizarPareamento(app, SEGREDO, pollToken, daqui(720), new Date()),
      finalizarPareamento(app, SEGREDO, pollToken, daqui(720), new Date()),
    ]);

    const prontos = [a, b].filter((r) => r.status === "pronto");
    expect(prontos).toHaveLength(1);
  });

  it("guarda o hash, nunca o token de poll", async () => {
    const { pollToken } = await criarPareamento(app, SEGREDO, daqui(10));
    const { rows } = await admin.query<{ achou: string }>(
      "SELECT count(*)::text AS achou FROM wall_pairings WHERE encode(poll_token_hash, 'hex') = $1",
      [pollToken],
    );
    expect(rows[0]?.achou).toBe("0");
  });
});

describe("a autorização recusa o que não pode passar", () => {
  it("código desconhecido", async () => {
    await expect(
      autorizarPareamento(app, "ZZZZZZ", dados.a.eventoId, "1", new Date()),
    ).rejects.toMatchObject({ motivo: "desconhecido" });
  });

  it("código já usado", async () => {
    const { code } = await criarPareamento(app, SEGREDO, daqui(10));
    await autorizarPareamento(app, code, dados.a.eventoId, "1", new Date());
    await expect(
      autorizarPareamento(app, code, dados.b.eventoId, "1", new Date()),
    ).rejects.toBeInstanceOf(ErroAutorizacaoDePareamento);
  });

  it("código expirado", async () => {
    const { code } = await criarPareamento(app, SEGREDO, daqui(-1));
    await expect(
      autorizarPareamento(app, code, dados.a.eventoId, "1", new Date()),
    ).rejects.toMatchObject({ motivo: "expirado" });
  });
});
