import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bloquearConvidado } from "./block-db";
import { gravarComentario } from "./comment-db";
import { denunciarComentario, listarComentariosVisiveisDaFoto } from "./comment-moderation-db";
import { comEvento } from "./event";
import { listarFeed } from "./feed";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;
let outroDeA: string;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);

  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
     VALUES ($1, 'Carlos', 'v1', now()) RETURNING id`,
    [dados.a.eventoId],
  );
  outroDeA = rows[0]!.id;

  await admin.query(
    `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
     VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000)`,
    [dados.a.eventoId, outroDeA, `events/${dados.a.eventoId}/2026/08/carlos/full`],
  );
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("bloqueio simetrico", () => {
  it("some do feed um do outro", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      bloquearConvidado(c, {
        eventoId: dados.a.eventoId,
        bloqueadorId: dados.a.sessaoId,
        bloqueadoId: outroDeA,
      }),
    );

    const feedDeA = await comEvento(app, dados.a.eventoId, (c) =>
      listarFeed(c, {
        eventoId: dados.a.eventoId,
        modo: "completo",
        missaoId: null,
        cursor: null,
        sessaoId: dados.a.sessaoId,
      }),
    );

    const feedDeOutro = await comEvento(app, dados.a.eventoId, (c) =>
      listarFeed(c, {
        eventoId: dados.a.eventoId,
        modo: "completo",
        missaoId: null,
        cursor: null,
        sessaoId: outroDeA,
      }),
    );

    const autoresDeA = feedDeA.itens.map((i) => i.autor);
    const autoresDeOutro = feedDeOutro.itens.map((i) => i.autor);

    expect(autoresDeA.every((a) => a !== "Carlos")).toBe(true);
    expect(autoresDeOutro.every((a) => a !== "convidado-evento-a")).toBe(true);
  });
});

describe("denuncia de comentario", () => {
  it("some da lista apos denuncias suficientes", async () => {
    const comentarioId = randomUUID();

    await comEvento(app, dados.a.eventoId, (c) =>
      gravarComentario(c, {
        id: comentarioId,
        eventoId: dados.a.eventoId,
        midiaId: dados.a.uploadId,
        sessaoId: outroDeA,
        respostaA: null,
        texto: "comentario a denunciar",
      }),
    );

    await comEvento(app, dados.a.eventoId, (c) =>
      denunciarComentario(c, { comentarioId, sessaoId: dados.a.sessaoId }),
    );

    const { rows: terceiro } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'Terceiro', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );

    await comEvento(app, dados.a.eventoId, (c) =>
      denunciarComentario(c, { comentarioId, sessaoId: terceiro[0]!.id }),
    );

    const visiveis = await comEvento(app, dados.a.eventoId, (c) =>
      listarComentariosVisiveisDaFoto(c, dados.a.eventoId, dados.a.uploadId, dados.a.sessaoId),
    );

    expect(visiveis.map((c) => c.id)).not.toContain(comentarioId);
  });
});
