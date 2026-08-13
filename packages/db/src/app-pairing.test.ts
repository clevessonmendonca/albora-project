import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  criarCodigoPareamentoApp,
  ErroResgateDePareamento,
  resgatarCodigoPareamentoApp,
} from "./app-pairing";
import { criarSessao, resolverSessao } from "./sessions";
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

describe("pareamento web → app", () => {
  it("emite codigo de 4 digitos e resgata para a mesma sessao", async () => {
    const { token, sessaoId } = await criarSessao(app, SEGREDO, {
      eventoId: dados.a.eventoId,
      nome: "Maria",
      consentimentoVersao: "v1",
      duracaoHoras: 48,
    });

    const antes = await resolverSessao(app, SEGREDO, token);
    expect(antes.sessaoId).toBe(sessaoId);

    const { code } = await criarCodigoPareamentoApp(
      app,
      dados.a.eventoId,
      sessaoId,
      daqui(15),
    );
    expect(code).toMatch(/^\d{4}$/);

    const resgatado = await resgatarCodigoPareamentoApp(app, SEGREDO, code, 48, new Date());
    expect(resgatado.sessaoId).toBe(sessaoId);
    expect(resgatado.eventoId).toBe(dados.a.eventoId);
    expect(resgatado.slug).toBe("evento-a");

    const depois = await resolverSessao(app, SEGREDO, resgatado.token);
    expect(depois).toEqual({ eventoId: dados.a.eventoId, sessaoId });
  });

  it("consome uma vez so: o segundo resgate falha", async () => {
    const { sessaoId } = await criarSessao(app, SEGREDO, {
      eventoId: dados.a.eventoId,
      nome: "Joao",
      consentimentoVersao: "v1",
      duracaoHoras: 48,
    });

    const { code } = await criarCodigoPareamentoApp(
      app,
      dados.a.eventoId,
      sessaoId,
      daqui(15),
    );

    await resgatarCodigoPareamentoApp(app, SEGREDO, code, 48, new Date());
    await expect(
      resgatarCodigoPareamentoApp(app, SEGREDO, code, 48, new Date()),
    ).rejects.toMatchObject({ motivo: "ja_usado" });
  });

  it("codigo expirado e desconhecido recusam com motivo proprio", async () => {
    const { sessaoId } = await criarSessao(app, SEGREDO, {
      eventoId: dados.a.eventoId,
      nome: "Ana",
      consentimentoVersao: "v1",
      duracaoHoras: 48,
    });

    const { code } = await criarCodigoPareamentoApp(
      app,
      dados.a.eventoId,
      sessaoId,
      daqui(-1),
    );

    await expect(
      resgatarCodigoPareamentoApp(app, SEGREDO, code, 48, new Date()),
    ).rejects.toBeInstanceOf(ErroResgateDePareamento);

    await expect(
      resgatarCodigoPareamentoApp(app, SEGREDO, "9999", 48, new Date()),
    ).rejects.toMatchObject({ motivo: "desconhecido" });
  });

  it("novo codigo cancela o pendente anterior da mesma sessao", async () => {
    const { sessaoId } = await criarSessao(app, SEGREDO, {
      eventoId: dados.a.eventoId,
      nome: "Pedro",
      consentimentoVersao: "v1",
      duracaoHoras: 48,
    });

    const primeiro = await criarCodigoPareamentoApp(
      app,
      dados.a.eventoId,
      sessaoId,
      daqui(15),
    );
    await criarCodigoPareamentoApp(app, dados.a.eventoId, sessaoId, daqui(15));

    await expect(
      resgatarCodigoPareamentoApp(app, SEGREDO, primeiro.code, 48, new Date()),
    ).rejects.toMatchObject({ motivo: "ja_usado" });
  });
});
