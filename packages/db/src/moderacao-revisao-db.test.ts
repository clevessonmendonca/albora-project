import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./evento";
import {
  liberarComentarioDoEvento,
  liberarMidiaDoEvento,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
} from "./moderacao-revisao-db";
import { abrirInteracaoDoEvento, atualizarModeracaoDoEvento } from "./moderacao-evento";
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

describe("fila de revisao", () => {
  it("modo endurecido coloca foto publicada na fila", async () => {
    await atualizarModeracaoDoEvento(app, dados.a.contaId, dados.a.eventoId, {
      modoEndurecido: true,
    });

    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published')
       RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/x/full`],
    );
    const uploadId = rows[0]!.id;

    const fila = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaParaRevisao(c, dados.a.eventoId),
    );

    expect(fila.some((m) => m.id === uploadId)).toBe(true);

    const liberou = await comEvento(app, dados.a.eventoId, (c) =>
      liberarMidiaDoEvento(c, uploadId),
    );
    expect(liberou).toBe(true);

    const depois = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaParaRevisao(c, dados.a.eventoId),
    );
    expect(depois.some((m) => m.id === uploadId)).toBe(false);

    await atualizarModeracaoDoEvento(app, dados.a.contaId, dados.a.eventoId, {
      modoEndurecido: false,
    });
  });

  it("comentario suspeito entra na fila e some ao liberar", async () => {
    const { rows: up } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state, released_by_host)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published', true)
       RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/y/full`],
    );
    const uploadId = up[0]!.id;

    const { rows: com } = await admin.query<{ id: string }>(
      `INSERT INTO comments (event_id, upload_id, session_id, body, state, classifier_verdict)
       VALUES ($1, $2, $3, 'texto suspeito', 'published', 'suspeito')
       RETURNING id`,
      [dados.a.eventoId, uploadId, dados.a.sessaoId],
    );
    const comentarioId = com[0]!.id;

    const fila = await comEvento(app, dados.a.eventoId, (c) =>
      listarComentariosParaRevisao(c, dados.a.eventoId),
    );
    expect(fila.some((c) => c.id === comentarioId)).toBe(true);

    const liberou = await comEvento(app, dados.a.eventoId, (c) =>
      liberarComentarioDoEvento(c, comentarioId),
    );
    expect(liberou).toBe(true);

    const depois = await comEvento(app, dados.a.eventoId, (c) =>
      listarComentariosParaRevisao(c, dados.a.eventoId),
    );
    expect(depois.some((c) => c.id === comentarioId)).toBe(false);
  });
});

describe("gate de interacao", () => {
  it("abrirInteracaoDoEvento grava instante no passado ou presente", async () => {
    const antes = Date.now();
    const evento = await abrirInteracaoDoEvento(app, dados.a.contaId, dados.a.eventoId);
    expect(evento?.interacaoAbreEm).not.toBeNull();
    expect(evento!.interacaoAbreEm!.getTime()).toBeLessThanOrEqual(Date.now());
    expect(evento!.interacaoAbreEm!.getTime()).toBeGreaterThanOrEqual(antes - 5_000);
  });
});
