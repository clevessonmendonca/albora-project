import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento, contarVideosDaSessao, criarSessao, planoDoEvento } from "./index";
import { prepararBanco, semear } from "./testes/banco";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";

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

describe("plano-db", () => {
  it("conta só vídeos da sessão", async () => {
    const { sessaoId } = await criarSessao(app, SEGREDO, {
      eventoId: dados.a.eventoId,
      nome: "Bia",
      consentimentoVersao: "v1",
      duracaoHoras: 12,
    });

    await comEvento(app, dados.a.eventoId, async (c) => {
      await c.query(
        `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
         VALUES ($1, $2, $3, $4, 'video/mp4', 1000)`,
        [crypto.randomUUID(), dados.a.eventoId, sessaoId, `events/${dados.a.eventoId}/v/full`],
      );
      await c.query(
        `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
         VALUES ($1, $2, $3, $4, 'image/jpeg', 500)`,
        [crypto.randomUUID(), dados.a.eventoId, sessaoId, `events/${dados.a.eventoId}/f/full`],
      );

      expect(await contarVideosDaSessao(c, dados.a.eventoId, sessaoId)).toBe(1);
      expect(await planoDoEvento(c, dados.a.eventoId)).toBe("free");
    });
  });
});
