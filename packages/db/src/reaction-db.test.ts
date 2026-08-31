import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import { apagarReacao, gravarReacao, listarReacoesDaMidia, reacaoDaSessao } from "./reaction-db";
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

  it("lista quem curtiu com primeiro nome e respeita bloqueio", async () => {
    const { rows: sessoes } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'Maria Clara', 1, now()), ($1, 'João Pedro', 1, now())
       RETURNING id`,
      [dados.a.eventoId],
    );
    const maria = sessoes[0]!.id;
    const joao = sessoes[1]!.id;

    await comEvento(app, dados.a.eventoId, async (c) => {
      await gravarReacao(c, dados.a.eventoId, dados.a.uploadId, maria, "estrela");
      await gravarReacao(c, dados.a.eventoId, dados.a.uploadId, joao, "estrela");

      const visivel = await listarReacoesDaMidia(c, dados.a.uploadId, dados.a.sessaoId);
      expect(visivel.map((v) => v.nome)).toEqual(["Maria", "João"]);

      await c.query(
        `INSERT INTO guest_blocks (event_id, blocker_id, blocked_id)
         VALUES ($1, $2, $3)`,
        [dados.a.eventoId, dados.a.sessaoId, joao],
      );
      const semBloqueado = await listarReacoesDaMidia(c, dados.a.uploadId, dados.a.sessaoId);
      expect(semBloqueado.map((v) => v.nome)).toEqual(["Maria"]);
    });
  });
});
