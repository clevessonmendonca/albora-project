import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { desafioDoEvento, listarDesafios } from "./challenges";
import { comEvento } from "./event";
import { prepararBanco, semear } from "./testes/banco";
import { anotarUpload, confirmarUpload } from "./uploads";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;
let missaoA: string;
let missaoB: string;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);

  const criarMissao = async (eventoId: string, chave: string, ordem: number) => {
    const { rows } = await admin.query(
      "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3) RETURNING id",
      [eventoId, chave, ordem],
    );
    return rows[0].id as string;
  };

  missaoA = await criarMissao(dados.a.eventoId, "missao.um", 1);
  await criarMissao(dados.a.eventoId, "missao.dois", 2);
  missaoB = await criarMissao(dados.b.eventoId, "missao.um", 1);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("missões do evento", () => {
  it("lista só as do próprio evento, na ordem", async () => {
    const lista = await comEvento(app, dados.a.eventoId, (c) =>
      listarDesafios(c, dados.a.eventoId, dados.a.sessaoId),
    );

    expect(lista.map((d) => d.chaveTitulo)).toEqual(["missao.um", "missao.dois"]);
    expect(lista.map((d) => d.id)).not.toContain(missaoB);
  });

  it("nada é 'feito' antes de a sessão mandar foto", async () => {
    const lista = await comEvento(app, dados.a.eventoId, (c) =>
      listarDesafios(c, dados.a.eventoId, dados.a.sessaoId),
    );

    expect(lista.every((d) => !d.feito)).toBe(true);
  });

  it("'feito' é por sessão, não por evento", async () => {
    // Quem chega às 23h precisa ver a lista inteira aberta, e não a lista que
    // os outros já cumpriram.
    const uploadId = randomUUID();

    await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, {
        uploadId,
        eventId: dados.a.eventoId,
        sessionId: dados.a.sessaoId,
        challengeId: missaoA,
        storageKey: `events/${dados.a.eventoId}/2026/08/${uploadId}/full`,
        mime: "image/jpeg",
        bytes: 800_000,
        caption: null,
        place: null,
      }),
    );

    const daSessao = await comEvento(app, dados.a.eventoId, (c) =>
      listarDesafios(c, dados.a.eventoId, dados.a.sessaoId),
    );
    const deOutraSessao = await comEvento(app, dados.a.eventoId, (c) =>
      listarDesafios(c, dados.a.eventoId, randomUUID()),
    );

    expect(daSessao.find((d) => d.id === missaoA)?.feito).toBe(true);
    expect(deOutraSessao.every((d) => !d.feito)).toBe(true);
  });
});

describe("missão pertence ao evento", () => {
  it("aceita a do próprio evento", async () => {
    const ok = await comEvento(app, dados.a.eventoId, (c) =>
      desafioDoEvento(c, dados.a.eventoId, missaoA),
    );

    expect(ok).toBe(true);
  });

  it("recusa a de outro evento", async () => {
    const ok = await comEvento(app, dados.a.eventoId, (c) =>
      desafioDoEvento(c, dados.a.eventoId, missaoB),
    );

    expect(ok).toBe(false);
  });

  it("id que não é uuid devolve false, não estoura", async () => {
    // Chega do cliente. Uma exceção aqui viraria 500 no caminho crítico.
    const ok = await comEvento(app, dados.a.eventoId, (c) =>
      desafioDoEvento(c, dados.a.eventoId, "'; DROP TABLE uploads; --"),
    );

    expect(ok).toBe(false);
  });
});

describe("anotar é do dono da foto", () => {
  async function fotoDe(d: { eventoId: string; sessaoId: string }) {
    const uploadId = randomUUID();
    await comEvento(app, d.eventoId, (c) =>
      confirmarUpload(c, {
        uploadId,
        eventId: d.eventoId,
        sessionId: d.sessaoId,
        challengeId: null,
        storageKey: `events/${d.eventoId}/2026/08/${uploadId}/full`,
        mime: "image/jpeg",
        bytes: 800_000,
        caption: null,
        place: null,
      }),
    );
    return uploadId;
  }

  it("o dono escreve legenda e lugar", async () => {
    const uploadId = await fotoDe(dados.a);

    const anotado = await comEvento(app, dados.a.eventoId, (c) =>
      anotarUpload(c, {
        uploadId,
        sessionId: dados.a.sessaoId,
        caption: "a mesa toda de pé",
        place: "pista",
      }),
    );

    const { rows } = await admin.query("SELECT caption, place FROM uploads WHERE id = $1", [
      uploadId,
    ]);

    expect(anotado).toBe(true);
    expect(rows[0].caption).toBe("a mesa toda de pé");
    expect(rows[0].place).toBe("pista");
  });

  it("outra sessão do MESMO evento não escreve na foto alheia", async () => {
    // A RLS garante o evento e para por aí. Dentro do evento, quem separa uma
    // foto da outra é o `session_id` — e é a única coisa que separa.
    const uploadId = await fotoDe(dados.a);
    const { rows: outra } = await admin.query(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'outro convidado', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );

    const anotado = await comEvento(app, dados.a.eventoId, (c) =>
      anotarUpload(c, {
        uploadId,
        sessionId: outra[0].id as string,
        caption: "legenda de intruso",
        place: null,
      }),
    );

    const { rows } = await admin.query("SELECT caption FROM uploads WHERE id = $1", [uploadId]);

    expect(anotado).toBe(false);
    expect(rows[0].caption).toBeNull();
  });

  it("null preserva o que já estava lá", async () => {
    // Anotar só o lugar não pode apagar a legenda: as duas caixas são
    // independentes, e o convidado preenche uma de cada vez.
    const uploadId = await fotoDe(dados.a);

    await comEvento(app, dados.a.eventoId, (c) =>
      anotarUpload(c, { uploadId, sessionId: dados.a.sessaoId, caption: "primeira", place: null }),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      anotarUpload(c, { uploadId, sessionId: dados.a.sessaoId, caption: null, place: "jardim" }),
    );

    const { rows } = await admin.query("SELECT caption, place FROM uploads WHERE id = $1", [
      uploadId,
    ]);

    expect(rows[0].caption).toBe("primeira");
    expect(rows[0].place).toBe("jardim");
  });
});
