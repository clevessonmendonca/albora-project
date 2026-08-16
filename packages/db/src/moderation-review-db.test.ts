import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import {
  liberarComentarioDoEvento,
  liberarMidiaDoEvento,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
} from "./moderation-review-db";
import { abrirInteracaoDoEvento, atualizarModeracaoDoEvento } from "./moderation-event";
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

  it("foto suspeita e classificador mudo entram na fila; nulo ainda não", async () => {
    const { rows: nula } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published')
       RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/classif-nula/full`],
    );
    const { rows: muda } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state, classifier_verdict)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published', 'sem-resposta')
       RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/classif-muda/full`],
    );
    const { rows: suspeita } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state, classifier_verdict)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published', 'suspeito')
       RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/classif-suspeita/full`],
    );

    const fila = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaParaRevisao(c, dados.a.eventoId),
    );
    const ids = fila.map((m) => m.id);

    expect(ids).not.toContain(nula[0]!.id);
    expect(ids).toContain(muda[0]!.id);
    expect(ids).toContain(suspeita[0]!.id);
    expect(fila.find((m) => m.id === suspeita[0]!.id)?.motivo).toBe("classificador");
    expect(fila.find((m) => m.id === muda[0]!.id)?.motivo).toBe("classificador");
  });

  it("pedido sou eu nessa foto entra na fila com motivo distinto e não some sozinho", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published')
       RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/sou-eu/full`],
    );
    const uploadId = rows[0]!.id;

    await admin.query(
      `INSERT INTO reports (event_id, upload_id, session_id, kind)
       VALUES ($1, $2, $3, 'aparece_na_foto')`,
      [dados.a.eventoId, uploadId, dados.a.sessaoId],
    );

    const fila = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaParaRevisao(c, dados.a.eventoId),
    );
    const item = fila.find((m) => m.id === uploadId);

    expect(item?.motivo).toBe("aparece_na_foto");
    expect(item?.pedidosDeRemocao).toBe(1);
    expect(item?.denuncias).toBe(0);

    const { rows: estado } = await admin.query<{ state: string }>(
      "SELECT state FROM uploads WHERE id = $1",
      [uploadId],
    );
    expect(estado[0]?.state).toBe("published");
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
