import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import {
  atualizarAudioDoRecado,
  atualizarRecado,
  ErroRecadoJaExiste,
  gravarRecado,
  leiturasDoRecado,
  marcarRecadoLido,
  recadoDoEvento,
} from "./guestbook-db";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

const TEXTO = "Obrigado por estar com a gente hoje.";
const ABERTURA = new Date("2026-08-11T22:00:00Z");

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("o recado vive so no evento do cracha", () => {
  it("some do evento A o recado gravado em B", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      gravarRecado(c, { eventoId: dados.a.eventoId, texto: TEXTO, publicaEm: ABERTURA }),
    );
    await comEvento(app, dados.b.eventoId, (c) =>
      gravarRecado(c, {
        eventoId: dados.b.eventoId,
        texto: "recado da outra festa",
        publicaEm: ABERTURA,
      }),
    );

    const doA = await comEvento(app, dados.a.eventoId, (c) => recadoDoEvento(c, dados.a.eventoId));

    expect(doA?.texto).toBe(TEXTO);
    expect(doA?.eventoId).toBe(dados.a.eventoId);
  });

  it("mesmo pedindo o id do outro evento, a RLS nao entrega o recado dele", async () => {
    const cruzado = await comEvento(app, dados.a.eventoId, (c) =>
      recadoDoEvento(c, dados.b.eventoId),
    );

    expect(cruzado).toBeNull();
  });
});

describe("um recado por evento", () => {
  it("o segundo INSERT no mesmo evento e recusado", async () => {
    await expect(
      comEvento(app, dados.a.eventoId, (c) =>
        gravarRecado(c, { eventoId: dados.a.eventoId, texto: "outro", publicaEm: ABERTURA }),
      ),
    ).rejects.toBeInstanceOf(ErroRecadoJaExiste);
  });

  it("editar troca o texto sem criar uma segunda linha", async () => {
    const editado = await comEvento(app, dados.a.eventoId, (c) =>
      atualizarRecado(c, {
        eventoId: dados.a.eventoId,
        texto: "Texto novo, ainda um so.",
        publicaEm: ABERTURA,
      }),
    );

    expect(editado?.texto).toBe("Texto novo, ainda um so.");

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM recado WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.n).toBe(1);
  });
});

describe("a chave de storage nao entra por esta porta", () => {
  it("a linha nasce sem audio_key — gravarRecado nao a carrega", async () => {
    const recado = await comEvento(app, dados.a.eventoId, (c) => recadoDoEvento(c, dados.a.eventoId));

    expect(recado?.audio).toBeNull();

    const { rows } = await admin.query<{ audio_key: string | null }>(
      "SELECT audio_key FROM recado WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.audio_key).toBeNull();
  });
});

describe("o audio e uma escrita propria", () => {
  it("grava e apaga a chave sem mexer no texto", async () => {
    const chave = `events/${dados.a.eventoId}/recado/11111111-2222-3333-4444-555555555555`;

    const comAudio = await comEvento(app, dados.a.eventoId, (c) =>
      atualizarAudioDoRecado(c, {
        eventoId: dados.a.eventoId,
        audio: { chave, duracaoSegundos: 20 },
      }),
    );

    expect(comAudio?.audio).toEqual({ chave, duracaoSegundos: 20 });

    const semAudio = await comEvento(app, dados.a.eventoId, (c) =>
      atualizarAudioDoRecado(c, { eventoId: dados.a.eventoId, audio: null }),
    );

    expect(semAudio?.texto).toBe(comAudio?.texto);
    expect(semAudio?.audio).toBeNull();
  });

  it("evento A nao grava audio no recado de B", async () => {
    const chaveB = `events/${dados.b.eventoId}/recado/11111111-2222-3333-4444-555555555555`;

    const cruzado = await comEvento(app, dados.a.eventoId, (c) =>
      atualizarAudioDoRecado(c, {
        eventoId: dados.b.eventoId,
        audio: { chave: chaveB, duracaoSegundos: 12 },
      }),
    );

    expect(cruzado).toBeNull();

    const doB = await comEvento(app, dados.b.eventoId, (c) => recadoDoEvento(c, dados.b.eventoId));
    expect(doB?.audio).toBeNull();
  });
});

describe("marcar lido e uma vez por sessao", () => {
  it("o segundo INSERT nao sobrescreve o lidoEm da primeira vez", async () => {
    const recado = await comEvento(app, dados.a.eventoId, (c) => recadoDoEvento(c, dados.a.eventoId));
    const primeiraEm = new Date("2026-08-11T22:01:00Z");
    const segundaEm = new Date("2026-08-11T23:00:00Z");

    const primeira = await comEvento(app, dados.a.eventoId, (c) =>
      marcarRecadoLido(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        recadoId: recado!.id,
        lidoEm: primeiraEm,
      }),
    );
    const segunda = await comEvento(app, dados.a.eventoId, (c) =>
      marcarRecadoLido(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        recadoId: recado!.id,
        lidoEm: segundaEm,
      }),
    );

    expect(primeira.inserida).toBe(true);
    expect(segunda.inserida).toBe(false);

    const leituras = await comEvento(app, dados.a.eventoId, (c) =>
      leiturasDoRecado(c, dados.a.eventoId, dados.a.sessaoId),
    );

    expect(leituras).toHaveLength(1);
    expect(leituras[0]!.lidoEm.toISOString()).toBe(primeiraEm.toISOString());
  });

  it("sessao do evento A nao ve a leitura do evento B", async () => {
    const recadoB = await comEvento(app, dados.b.eventoId, (c) => recadoDoEvento(c, dados.b.eventoId));
    await comEvento(app, dados.b.eventoId, (c) =>
      marcarRecadoLido(c, {
        eventoId: dados.b.eventoId,
        sessaoId: dados.b.sessaoId,
        recadoId: recadoB!.id,
        lidoEm: ABERTURA,
      }),
    );

    const cruzado = await comEvento(app, dados.a.eventoId, (c) =>
      leiturasDoRecado(c, dados.b.eventoId, dados.b.sessaoId),
    );

    expect(cruzado).toHaveLength(0);
  });
});
