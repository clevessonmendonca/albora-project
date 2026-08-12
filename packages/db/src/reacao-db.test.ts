import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./evento";
import { apagarReacao, gravarReacao, reacaoDaSessao } from "./reacao-db";
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

describe("reacao idempotente", () => {
  it("reagir duas vezes conta uma", async () => {
    const total = await comEvento(app, dados.a.eventoId, async (c) => {
      await gravarReacao(c, dados.a.eventoId, dados.a.uploadId, dados.a.sessaoId, "estrela");
      return gravarReacao(c, dados.a.eventoId, dados.a.uploadId, dados.a.sessaoId, "estrela");
    });
    expect(total).toBe(1);
  });

  it("remover zera a reacao da sessao", async () => {
    await comEvento(app, dados.a.eventoId, async (c) => {
      await gravarReacao(c, dados.a.eventoId, dados.a.uploadId, dados.a.sessaoId, "estrela");
      const depois = await apagarReacao(c, dados.a.uploadId, dados.a.sessaoId);
      expect(depois).toBe(0);
      expect(await reacaoDaSessao(c, dados.a.uploadId, dados.a.sessaoId)).toBeNull();
    });
  });
});
