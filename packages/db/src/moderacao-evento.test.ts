import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  abrirInteracaoDoEvento,
  alternarPanicoDoEvento,
  atualizarModeracaoDoEvento,
  buscarEventoDoHost,
  listarEventosDoHost,
} from "./moderacao-evento";
import { prepararBanco, semear } from "./testes/banco";

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

describe("moderacao do evento pelo host", () => {
  it("lista so os eventos da conta", async () => {
    const deA = await listarEventosDoHost(app, dados.a.contaId);
    expect(deA.map((e) => e.eventoId)).toContain(dados.a.eventoId);
    expect(deA.map((e) => e.eventoId)).not.toContain(dados.b.eventoId);
  });

  it("nao enxerga evento de outra conta", async () => {
    const cruzado = await buscarEventoDoHost(app, dados.a.contaId, dados.b.eventoId);
    expect(cruzado).toBeNull();
  });

  it("persiste panic e has_minors", async () => {
    const depois = await atualizarModeracaoDoEvento(app, dados.a.contaId, dados.a.eventoId, {
      panico: true,
      haMenores: true,
    });

    expect(depois?.moderacao.panico).toBe(true);
    expect(depois?.moderacao.haMenores).toBe(true);

    const relido = await buscarEventoDoHost(app, dados.a.contaId, dados.a.eventoId);
    expect(relido?.moderacao).toEqual(depois?.moderacao);
  });

  it("conta B nao altera evento de A", async () => {
    const antes = await buscarEventoDoHost(app, dados.a.contaId, dados.a.eventoId);
    const tentativa = await atualizarModeracaoDoEvento(app, dados.b.contaId, dados.a.eventoId, {
      panico: true,
    });
    expect(tentativa).toBeNull();

    const depois = await buscarEventoDoHost(app, dados.a.contaId, dados.a.eventoId);
    expect(depois?.moderacao).toEqual(antes?.moderacao);
  });
});

describe("panico pela parede", () => {
  it("alternarPanicoDoEvento inverte o estado", async () => {
    const antes = await buscarEventoDoHost(app, dados.a.contaId, dados.a.eventoId);
    const panicoInicial = antes!.moderacao.panico;

    const ligado = await alternarPanicoDoEvento(app, dados.a.eventoId);
    expect(ligado).toBe(!panicoInicial);

    const desligado = await alternarPanicoDoEvento(app, dados.a.eventoId);
    expect(desligado).toBe(panicoInicial);
  });
});
