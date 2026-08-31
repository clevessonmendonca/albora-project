import { lerLinkDeMusica, ordenarSugestoes, votos, type LinkDeMusica } from "@albora/core";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import {
  adicionarSugestao,
  definirMusicaDoCasal,
  listarSugestoes,
  musicaDoCasal,
} from "./music-db";
import { prepararBanco, semear } from "./testes/banco";

/** Contra banco real — RLS escopa ao evento do crachá; UNIQUE impede sugestão duplicada da mesma sessão; mock de RLS prova que o mock isola. */

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

function faixa(url: string): LinkDeMusica {
  const r = lerLinkDeMusica(url);
  if (!r.ok) throw new Error(`fixture invalida: ${url}`);
  return r.link;
}

const FAIXA_1 = faixa("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");
const FAIXA_2 = faixa("https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M");

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("a sugestao vive so no evento do cracha", () => {
  it("some do evento A a faixa sugerida em B", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, { eventoId: dados.a.eventoId, sessaoId: dados.a.sessaoId, link: FAIXA_1 }),
    );
    await comEvento(app, dados.b.eventoId, (c) =>
      adicionarSugestao(c, { eventoId: dados.b.eventoId, sessaoId: dados.b.sessaoId, link: FAIXA_2 }),
    );

    const doA = await comEvento(app, dados.a.eventoId, (c) => listarSugestoes(c, dados.a.eventoId));

    expect(doA.map((f) => f.link.identificador)).toContain(FAIXA_1.identificador);
    expect(doA.map((f) => f.link.identificador)).not.toContain(FAIXA_2.identificador);
  });

  it("mesmo pedindo o id do outro evento, a RLS nao entrega a sugestao dele", async () => {
    const cruzado = await comEvento(app, dados.a.eventoId, (c) =>
      listarSugestoes(c, dados.b.eventoId),
    );

    expect(cruzado).toHaveLength(0);
  });
});

describe("a mesma sessao sugere a mesma faixa uma vez so", () => {
  it("o segundo INSERT nao insere, e o voto continua um", async () => {
    const primeira = await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, { eventoId: dados.a.eventoId, sessaoId: dados.a.sessaoId, link: FAIXA_1 }),
    );
    const segunda = await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, { eventoId: dados.a.eventoId, sessaoId: dados.a.sessaoId, link: FAIXA_1 }),
    );

    expect(segunda.inserida).toBe(false);
    void primeira;

    const fila = await comEvento(app, dados.a.eventoId, (c) => listarSugestoes(c, dados.a.eventoId));
    const alvo = fila.find((f) => f.link.identificador === FAIXA_1.identificador);

    expect(alvo).toBeTruthy();
    expect(votos(alvo!)).toBe(1);
  });

  it("duas sessoes na mesma faixa sao dois votos, e a mais votada ordena primeiro", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidada-dois', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );
    const segundaSessao = rows[0]!.id;

    await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, { eventoId: dados.a.eventoId, sessaoId: segundaSessao, link: FAIXA_1 }),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, { eventoId: dados.a.eventoId, sessaoId: segundaSessao, link: FAIXA_2 }),
    );

    const ordenada = ordenarSugestoes(
      await comEvento(app, dados.a.eventoId, (c) => listarSugestoes(c, dados.a.eventoId)),
    );

    expect(ordenada[0]?.link.identificador).toBe(FAIXA_1.identificador);
    expect(votos(ordenada[0]!)).toBe(2);
  });
});

describe("a escolha do casal e uma por evento", () => {
  it("grava, le de volta, e o UPDATE troca sem criar segunda linha", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      definirMusicaDoCasal(c, {
        eventoId: dados.a.eventoId,
        link: FAIXA_1,
        metadado: { titulo: "Primeira", artista: "Artista", capaUrl: null },
      }),
    );

    const antes = await comEvento(app, dados.a.eventoId, (c) => musicaDoCasal(c, dados.a.eventoId));
    expect(antes?.link.identificador).toBe(FAIXA_1.identificador);
    expect(antes?.metadado?.titulo).toBe("Primeira");

    await comEvento(app, dados.a.eventoId, (c) =>
      definirMusicaDoCasal(c, { eventoId: dados.a.eventoId, link: FAIXA_2, metadado: null }),
    );

    const depois = await comEvento(app, dados.a.eventoId, (c) => musicaDoCasal(c, dados.a.eventoId));
    expect(depois?.link.identificador).toBe(FAIXA_2.identificador);
    expect(depois?.metadado).toBeNull();

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM event_music WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.n).toBe(1);
  });

  it("evento sem musica devolve null, sem buraco de layout", async () => {
    const doB = await comEvento(app, dados.b.eventoId, (c) => musicaDoCasal(c, dados.b.eventoId));
    expect(doB).toBeNull();
  });
});

describe("titulo e artista da sugestao", () => {
  it("grava, le de volta, e a segunda sessao preenche se a primeira veio crua", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidada-meta', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );
    const outra = rows[0]!.id;
    const faixaMeta = faixa("https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b");

    await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        link: faixaMeta,
        metadado: null,
      }),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, {
        eventoId: dados.a.eventoId,
        sessaoId: outra,
        link: faixaMeta,
        metadado: { titulo: "Blinding Lights", artista: "The Weeknd", capaUrl: null },
      }),
    );

    const fila = await comEvento(app, dados.a.eventoId, (c) => listarSugestoes(c, dados.a.eventoId));
    const alvo = fila.find((f) => f.link.identificador === faixaMeta.identificador);

    expect(alvo?.metadado).toEqual({
      titulo: "Blinding Lights",
      artista: "The Weeknd",
      capaUrl: null,
    });
    expect(votos(alvo!)).toBe(2);
  });
});

describe("id da faixa — o que a story referencia em music_track_id", () => {
  it("o id é o da linha de music_suggestions que chegou primeiro, não muda com o segundo voto", async () => {
    const faixaId = faixa("https://open.spotify.com/track/2374M0fQpWi3dLnB54qaLX");

    await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, { eventoId: dados.a.eventoId, sessaoId: dados.a.sessaoId, link: faixaId }),
    );

    const { rows } = await admin.query<{ id: string }>(
      "SELECT id FROM music_suggestions WHERE event_id = $1 AND identifier = $2",
      [dados.a.eventoId, faixaId.identificador],
    );
    const idDaPrimeira = rows[0]!.id;

    const filaAntes = await comEvento(app, dados.a.eventoId, (c) => listarSugestoes(c, dados.a.eventoId));
    expect(filaAntes.find((f) => f.link.identificador === faixaId.identificador)?.id).toBe(idDaPrimeira);

    const { rows: segundaSessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidada-tres', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      adicionarSugestao(c, {
        eventoId: dados.a.eventoId,
        sessaoId: segundaSessao[0]!.id,
        link: faixaId,
      }),
    );

    const filaDepois = await comEvento(app, dados.a.eventoId, (c) => listarSugestoes(c, dados.a.eventoId));
    const alvo = filaDepois.find((f) => f.link.identificador === faixaId.identificador);
    expect(alvo?.id).toBe(idDaPrimeira);
    expect(votos(alvo!)).toBe(2);
  });
});
