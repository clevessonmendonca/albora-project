import { lerLinkDeMusica, type LinkDeMusica } from "@albora/core";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import { adicionarSugestao, listarSugestoes } from "./music-db";
import { criarStory, storiesAtivasDoEvento } from "./story-db";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

function faixa(url: string): LinkDeMusica {
  const r = lerLinkDeMusica(url);
  if (!r.ok) throw new Error(`fixture invalida: ${url}`);
  return r.link;
}

const FAIXA = faixa("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");

/** Upload extra sem story — sem ele `UNIQUE (upload_id)` faria `criarStory` cair no fallback antes de exercitar o INSERT com `music_track_id`. */
async function criarUploadPublicado(eventoId: string, sessaoId: string): Promise<string> {
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
     VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000) RETURNING id`,
    [eventoId, sessaoId, `events/${eventoId}/2026/08/foto/${crypto.randomUUID()}`],
  );
  return rows[0]!.id;
}

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("story a partir de um upload confirmado", () => {
  it("cria e aparece na listagem ativa do próprio evento", async () => {
    const criada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.a.uploadId,
      }),
    );
    expect(criada?.criada).toBe(true);

    const ativas = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.a.eventoId),
    );
    expect(ativas).toHaveLength(1);
    expect(ativas[0]?.uploadId).toBe(dados.a.uploadId);
    expect(ativas[0]?.autor).toBe("convidado-evento-a");
  });

  it("criar duas vezes com o mesmo upload não duplica — idempotência do retry da fila", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.a.uploadId,
      }),
    );
    const segunda = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.a.uploadId,
      }),
    );
    expect(segunda?.criada).toBe(false);

    const { rows } = await admin.query("SELECT count(*)::int AS total FROM story WHERE upload_id = $1", [
      dados.a.uploadId,
    ]);
    expect(rows[0].total).toBe(1);
  });

  it("upload de outro evento não vira story — nem por RLS, nem pela checagem explícita", async () => {
    const criada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.b.uploadId,
      }),
    );
    expect(criada).toBeNull();

    const { rows } = await admin.query("SELECT count(*)::int AS total FROM story WHERE upload_id = $1", [
      dados.b.uploadId,
    ]);
    expect(rows[0].total).toBe(0);
  });

  it("story de outro evento não vaza para a listagem, mesmo com o event_id errado no parâmetro", async () => {
    await comEvento(app, dados.b.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.b.eventoId,
        sessaoId: dados.b.sessaoId,
        uploadId: dados.b.uploadId,
      }),
    );

    // Conectado sob app.event_id = A: pedir a listagem passando o eventoId de
    // B no parâmetro não deveria devolver nada — a RLS decide pela conexão,
    // não pelo argumento da função. Prova que a segunda camada (WHERE) não é
    // a única, e que a primeira (RLS) fecha mesmo se a segunda falhar.
    const comParametroErrado = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.b.eventoId),
    );
    expect(comParametroErrado).toHaveLength(0);

    const doProprioEvento = await comEvento(app, dados.b.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.b.eventoId),
    );
    expect(doProprioEvento).toHaveLength(1);
    expect(doProprioEvento[0]?.uploadId).toBe(dados.b.uploadId);
  });

  it("story vencida some da listagem sem precisar de job de delete", async () => {
    const criada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.a.uploadId,
      }),
    );
    expect(criada).not.toBeNull();

    await admin.query("UPDATE story SET expira_em = now() - interval '1 minute' WHERE id = $1", [
      criada!.id,
    ]);

    const ativas = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.a.eventoId),
    );
    expect(ativas.find((s) => s.id === criada!.id)).toBeUndefined();

    const { rows } = await admin.query("SELECT 1 FROM story WHERE id = $1", [criada!.id]);
    expect(rows).toHaveLength(1);
  });
});

describe("sticker de música na story (sub-etapa b)", () => {
  it("anexa a faixa votada e a listagem devolve link e metadado prontos", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        link: FAIXA,
        metadado: { titulo: "Perfect", artista: "Ed Sheeran", capaUrl: null },
      }),
    );
    const fila = await comEvento(app, dados.a.eventoId, (c) => listarSugestoes(c, dados.a.eventoId));
    const musicTrackId = fila[0]!.id!;

    const uploadId = await criarUploadPublicado(dados.a.eventoId, dados.a.sessaoId);
    const criada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, { eventoId: dados.a.eventoId, sessaoId: dados.a.sessaoId, uploadId, musicTrackId }),
    );
    expect(criada?.criada).toBe(true);

    const ativas = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.a.eventoId),
    );
    const story = ativas.find((s) => s.id === criada!.id);
    expect(story?.musica).toEqual({
      id: musicTrackId,
      link: FAIXA,
      metadado: { titulo: "Perfect", artista: "Ed Sheeran", capaUrl: null },
    });
  });

  it("story sem sticker de música tem musica null", async () => {
    const uploadId = await criarUploadPublicado(dados.a.eventoId, dados.a.sessaoId);
    await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, { eventoId: dados.a.eventoId, sessaoId: dados.a.sessaoId, uploadId }),
    );

    const ativas = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.a.eventoId),
    );
    expect(ativas.find((s) => s.uploadId === uploadId)?.musica).toBeNull();
  });

  it("faixa de outro evento degrada para sem música — a story sobe igual", async () => {
    await comEvento(app, dados.b.eventoId, (c) =>
      adicionarSugestao(c, { eventoId: dados.b.eventoId, sessaoId: dados.b.sessaoId, link: FAIXA }),
    );
    const filaDeB = await comEvento(app, dados.b.eventoId, (c) => listarSugestoes(c, dados.b.eventoId));
    const musicTrackIdDeOutroEvento = filaDeB[0]!.id!;

    const uploadId = await criarUploadPublicado(dados.a.eventoId, dados.a.sessaoId);
    const criada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId,
        musicTrackId: musicTrackIdDeOutroEvento,
      }),
    );
    expect(criada?.criada).toBe(true);

    const ativas = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.a.eventoId),
    );
    expect(ativas.find((s) => s.uploadId === uploadId)?.musica).toBeNull();
  });

  it("id de faixa inexistente ou mal formado degrada para sem música, nunca lança", async () => {
    const inexistente = await criarUploadPublicado(dados.a.eventoId, dados.a.sessaoId);
    const criadaInexistente = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: inexistente,
        musicTrackId: "00000000-0000-0000-0000-000000000000",
      }),
    );
    expect(criadaInexistente?.criada).toBe(true);

    const malFormado = await criarUploadPublicado(dados.a.eventoId, dados.a.sessaoId);
    const criadaMalFormada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: malFormado,
        musicTrackId: "'; DROP TABLE story; --",
      }),
    );
    expect(criadaMalFormada?.criada).toBe(true);

    const ativas = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.a.eventoId),
    );
    expect(ativas.find((s) => s.uploadId === inexistente)?.musica).toBeNull();
    expect(ativas.find((s) => s.uploadId === malFormado)?.musica).toBeNull();
  });
});
