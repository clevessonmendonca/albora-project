import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buscarUploadsParaClassificar,
  gravarVeredictoUpload,
  listarUploadsPendentesDeClassificacao,
  listEventsWithOrphanedUploads,
} from "./classificador-db";
import { comEvento } from "./event";
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

describe("pendentes de classificação", () => {
  it("lista só o nulo do evento do crachá", async () => {
    await admin.query("UPDATE uploads SET classifier_verdict = 'limpo' WHERE id = $1", [
      dados.b.uploadId,
    ]);

    const pendentes = await comEvento(app, dados.a.eventoId, (c) =>
      listarUploadsPendentesDeClassificacao(c, dados.a.eventoId),
    );

    expect(pendentes.map((p) => p.id)).toContain(dados.a.uploadId);
    expect(pendentes.map((p) => p.id)).not.toContain(dados.b.uploadId);
  });

  it("grava uma vez e some da fila", async () => {
    const gravou = await comEvento(app, dados.a.eventoId, (c) =>
      gravarVeredictoUpload(c, dados.a.uploadId, "limpo"),
    );
    expect(gravou).toBe(true);

    const deNovo = await comEvento(app, dados.a.eventoId, (c) =>
      gravarVeredictoUpload(c, dados.a.uploadId, "suspeito"),
    );
    expect(deNovo).toBe(false);

    const pendentes = await comEvento(app, dados.a.eventoId, (c) =>
      listarUploadsPendentesDeClassificacao(c, dados.a.eventoId),
    );
    expect(pendentes.map((p) => p.id)).not.toContain(dados.a.uploadId);

    const { rows } = await admin.query<{ classifier_verdict: string }>(
      "SELECT classifier_verdict FROM uploads WHERE id = $1",
      [dados.a.uploadId],
    );
    expect(rows[0]?.classifier_verdict).toBe("limpo");
  });
});

describe("buscarUploadsParaClassificar (Task 6 — join com a fila de moderação)", () => {
  it("junta os ids claimados com storage_key/mime, escopado ao evento do crachá", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
       VALUES (gen_random_uuid(), $1, $2, $3, 'video/mp4', 900000) RETURNING id`,
      [
        dados.a.eventoId,
        dados.a.sessaoId,
        `events/${dados.a.eventoId}/2026/08/moderacao-join/full`,
      ],
    );
    const outroUploadId = rows[0]!.id;

    const encontrados = await comEvento(app, dados.a.eventoId, (c) =>
      buscarUploadsParaClassificar(c, dados.a.eventoId, [outroUploadId, dados.b.uploadId]),
    );

    expect(encontrados.get(outroUploadId)).toEqual({
      chaveFull: `events/${dados.a.eventoId}/2026/08/moderacao-join/full`,
      mime: "video/mp4",
    });
    // uploadId de outro evento não aparece, mesmo pedido explicitamente — RLS + WHERE event_id.
    expect(encontrados.has(dados.b.uploadId)).toBe(false);
  });

  it("lista vazia não bate no banco e devolve mapa vazio", async () => {
    const encontrados = await comEvento(app, dados.a.eventoId, (c) =>
      buscarUploadsParaClassificar(c, dados.a.eventoId, []),
    );
    expect(encontrados.size).toBe(0);
  });
});

describe("listEventsWithOrphanedUploads — rede de segurança pro confirm que falhou ao enfileirar", () => {
  it("lista o evento com upload publicado sem veredito, mesmo sem NENHUMA linha em photo_moderation", async () => {
    // Nunca passa por enqueueModeration — simula o confirm que falhou por
    // completo sob o SAVEPOINT, então a mídia não existe na fila normal.
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000) RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/2026/08/orfao/full`],
    );
    const uploadOrfaoId = rows[0]!.id;

    const { rows: naFila } = await admin.query(
      "SELECT 1 FROM photo_moderation WHERE upload_id = $1",
      [uploadOrfaoId],
    );
    expect(naFila).toHaveLength(0); // confirma o cenário: órfão de verdade, sem linha na fila

    const eventos = await listEventsWithOrphanedUploads(admin, 100);
    expect(eventos).toContain(dados.a.eventoId);
  });

  it("não lista evento cujos uploads já têm veredito", async () => {
    await admin.query("UPDATE uploads SET classifier_verdict = 'limpo' WHERE event_id = $1", [
      dados.b.eventoId,
    ]);

    const eventos = await listEventsWithOrphanedUploads(admin, 100);
    expect(eventos).not.toContain(dados.b.eventoId);
  });
});
