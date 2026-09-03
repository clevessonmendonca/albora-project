import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  desafioDoEvento,
  listarDesafios,
  substituirDesafios,
  substituirMissoesCustom,
} from "./challenges";
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

describe("substituir missões", () => {
  it("reordena, acrescenta e remove, na ordem pedida", async () => {
    const lista = await comEvento(app, dados.a.eventoId, async (c) => {
      await substituirDesafios(c, dados.a.eventoId, ["missao.dois", "missao.nova"]);
      return listarDesafios(c, dados.a.eventoId, dados.a.sessaoId);
    });

    expect(lista.map((d) => d.chaveTitulo)).toEqual(["missao.dois", "missao.nova"]);
    expect(lista.map((d) => d.ordem)).toEqual([1, 2]);
  });

  it("mantém o id de quem continua — a foto não perde a missão", async () => {
    const { idAntes, idDepois } = await comEvento(app, dados.a.eventoId, async (c) => {
      const [antes] = await substituirDesafios(c, dados.a.eventoId, ["missao.keep"]);
      const [depois] = await substituirDesafios(c, dados.a.eventoId, ["missao.keep", "missao.extra"]);
      return { idAntes: antes!.id, idDepois: depois!.id };
    });

    expect(idDepois).toBe(idAntes);
  });

  it("lista vazia é modo livre — apaga as missões do evento", async () => {
    const lista = await comEvento(app, dados.a.eventoId, (c) =>
      substituirDesafios(c, dados.a.eventoId, []),
    );

    expect(lista).toEqual([]);
  });

  it("foto da missão removida fica, sem challenge_id", async () => {
    const { missaoId, uploadId } = await comEvento(app, dados.a.eventoId, async (c) => {
      const [missao] = await substituirDesafios(c, dados.a.eventoId, ["missao.ligada"]);
      const uploadId = randomUUID();
      await confirmarUpload(c, {
        uploadId,
        eventId: dados.a.eventoId,
        sessionId: dados.a.sessaoId,
        challengeId: missao!.id,
        storageKey: `events/${dados.a.eventoId}/2026/08/${uploadId}/full`,
        mime: "image/jpeg",
        bytes: 800_000,
        caption: null,
        place: null,
      });
      await substituirDesafios(c, dados.a.eventoId, ["missao.outra"]);
      return { missaoId: missao!.id, uploadId };
    });

    const { rows } = await admin.query("SELECT challenge_id FROM uploads WHERE id = $1", [uploadId]);

    expect(rows[0].challenge_id).toBeNull();
    expect(missaoId).toBeTruthy();
  });

  it("não enxerga nem apaga a missão do outro evento", async () => {
    await comEvento(app, dados.b.eventoId, (c) =>
      substituirDesafios(c, dados.b.eventoId, ["missao.do-b"]),
    );

    const doA = await comEvento(app, dados.a.eventoId, (c) =>
      substituirDesafios(c, dados.a.eventoId, ["missao.so-a"]),
    );
    const doB = await comEvento(app, dados.b.eventoId, (c) =>
      listarDesafios(c, dados.b.eventoId, dados.b.sessaoId),
    );

    expect(doA.map((d) => d.chaveTitulo)).toEqual(["missao.so-a"]);
    expect(doB.map((d) => d.chaveTitulo)).toEqual(["missao.do-b"]);
  });

  it("chave duplicada ou vazia falha alto, não grava metade", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      substituirDesafios(c, dados.a.eventoId, ["missao.ok"]),
    );

    await expect(
      comEvento(app, dados.a.eventoId, (c) =>
        substituirDesafios(c, dados.a.eventoId, ["missao.ok", "missao.ok"]),
      ),
    ).rejects.toThrow(/duplicad/i);

    await expect(
      comEvento(app, dados.a.eventoId, (c) => substituirDesafios(c, dados.a.eventoId, [""])),
    ).rejects.toThrow(/inválida/i);

    const lista = await comEvento(app, dados.a.eventoId, (c) =>
      listarDesafios(c, dados.a.eventoId, dados.a.sessaoId),
    );
    expect(lista.map((d) => d.chaveTitulo)).toEqual(["missao.ok"]);
  });
});

describe("missões personalizadas — prazo opcional", () => {
  it("cria sem prazo (deadline null) e sem quebrar o pack", async () => {
    const lista = await comEvento(app, dados.a.eventoId, async (c) => {
      await substituirDesafios(c, dados.a.eventoId, ["missao.pack-fixo"]);
      return substituirMissoesCustom(c, dados.a.eventoId, [
        { titulo: "Foto com a torta", posicao: 1000 },
      ]);
    });

    const custom = lista.find((d) => d.tituloCustom === "Foto com a torta");
    expect(custom?.deadline).toBeNull();
    expect(lista.map((d) => d.chaveTitulo)).toContain("missao.pack-fixo");
  });

  it("grava, atualiza e limpa o prazo", async () => {
    const futuro = new Date(Date.now() + 3_600_000).toISOString();
    const outro = new Date(Date.now() + 7_200_000).toISOString();

    const { comPrazo, atualizada, limpa } = await comEvento(app, dados.a.eventoId, async (c) => {
      const criada = await substituirMissoesCustom(c, dados.a.eventoId, [
        { titulo: "Missão com prazo", posicao: 2000, deadline: futuro },
      ]);
      const id = criada.find((d) => d.tituloCustom === "Missão com prazo")!.id;

      const depoisDeAtualizar = await substituirMissoesCustom(c, dados.a.eventoId, [
        { id, titulo: "Missão com prazo", posicao: 2000, deadline: outro },
      ]);

      const depoisDeLimpar = await substituirMissoesCustom(c, dados.a.eventoId, [
        { id, titulo: "Missão com prazo", posicao: 2000, deadline: null },
      ]);

      return {
        comPrazo: criada.find((d) => d.id === id),
        atualizada: depoisDeAtualizar.find((d) => d.id === id),
        limpa: depoisDeLimpar.find((d) => d.id === id),
      };
    });

    expect(comPrazo?.deadline).toBe(futuro);
    expect(atualizada?.deadline).toBe(outro);
    expect(limpa?.deadline).toBeNull();
  });

  it("prazo inválido falha alto, não grava metade", async () => {
    await expect(
      comEvento(app, dados.a.eventoId, (c) =>
        substituirMissoesCustom(c, dados.a.eventoId, [
          { titulo: "Missão quebrada", posicao: 3000, deadline: "não-é-data" },
        ]),
      ),
    ).rejects.toThrow(/prazo inválido/i);
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
