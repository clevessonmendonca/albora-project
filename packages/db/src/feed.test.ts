import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./evento";
import { codificarCursor, ErroCursorInvalido, gateDoEvento, listarFeed } from "./feed";
import { prepararBanco, semear } from "./testes/banco";

/**
 * Contra banco real, como `albora_app` — papel comum, sem BYPASSRLS. Testar
 * isolamento contra mock prova que o mock está isolado; testar como superuser
 * prova menos ainda, porque ele ignora RLS mesmo com FORCE.
 */

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

let missaoA: string;
let missaoPaginacao: string;
let missaoB: string;

const ABRE_EM = new Date("2026-06-01T22:00:00Z");
const ANTES_DO_GATE = new Date("2026-06-01T21:59:59Z");
const DEPOIS_DO_GATE = new Date("2026-06-02T02:00:00Z");

async function criarMissao(eventoId: string, chave: string, ordem: number): Promise<string> {
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3) RETURNING id",
    [eventoId, chave, ordem],
  );
  return rows[0]!.id;
}

async function criarFoto(entrada: {
  eventoId: string;
  sessaoId: string;
  criadaEm: string;
  missaoId?: string | null;
  estado?: string;
}): Promise<string> {
  const id = randomUUID();
  await admin.query(
    `INSERT INTO uploads (id, event_id, session_id, challenge_id, storage_key, mime, bytes, state, created_at)
     VALUES ($1, $2, $3, $4, $5, 'image/jpeg', 800000, $6, $7)`,
    [
      id,
      entrada.eventoId,
      entrada.sessaoId,
      entrada.missaoId ?? null,
      `events/${entrada.eventoId}/2026/06/${id}/full`,
      entrada.estado ?? "published",
      entrada.criadaEm,
    ],
  );
  return id;
}

const feedDe = (
  d: { eventoId: string },
  opcoes: Partial<Parameters<typeof listarFeed>[1]> = {},
) =>
  comEvento(app, d.eventoId, (c) =>
    listarFeed(c, {
      eventoId: d.eventoId,
      modo: "espelho",
      missaoId: null,
      cursor: null,
      ...opcoes,
    }),
  );

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);

  missaoA = await criarMissao(dados.a.eventoId, "missao.um", 1);
  missaoPaginacao = await criarMissao(dados.a.eventoId, "missao.dois", 2);
  missaoB = await criarMissao(dados.b.eventoId, "missao.um", 1);

  await admin.query("UPDATE events SET interaction_opens_at = $2 WHERE id = $1", [
    dados.a.eventoId,
    ABRE_EM,
  ]);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("o feed de um evento nunca enxerga foto de outro", () => {
  it("as fotos do outro evento não entram, nem com id conhecido", async () => {
    await criarFoto({
      eventoId: dados.b.eventoId,
      sessaoId: dados.b.sessaoId,
      criadaEm: "2030-01-01T00:00:00Z",
    });

    const pagina = await feedDe(dados.a);
    const ids = pagina.itens.map((i) => i.id);

    expect(ids).toContain(dados.a.uploadId);
    expect(ids).not.toContain(dados.b.uploadId);
    expect(pagina.itens.every((i) => i.chaveFull.startsWith(`events/${dados.a.eventoId}/`))).toBe(
      true,
    );
  });

  it("cursor forjado com o instante de uma foto do outro evento não a alcança", async () => {
    // O cursor é opaco, mas nada impede o cliente de montar um. Ele desloca a
    // janela e não escolhe o evento — quem escolhe é a política de RLS.
    const cursor = codificarCursor("2031-01-01 00:00:00+00", dados.b.uploadId);
    const pagina = await feedDe(dados.a, { cursor });

    expect(pagina.itens.map((i) => i.id)).not.toContain(dados.b.uploadId);
    expect(pagina.itens.every((i) => i.chaveFull.startsWith(`events/${dados.a.eventoId}/`))).toBe(
      true,
    );
  });

  it("missão do outro evento devolve vazio, não erro", async () => {
    const pagina = await feedDe(dados.a, { missaoId: missaoB });

    expect(pagina.itens).toEqual([]);
    expect(pagina.proximoCursor).toBeNull();
  });

  it("gateDoEvento não devolve o horário de outro evento", async () => {
    const alheio = await comEvento(app, dados.a.eventoId, (c) =>
      gateDoEvento(c, dados.b.eventoId),
    );

    expect(alheio).toBeNull();
  });
});

describe("o feed lê exatamente o que a moderação liberou", () => {
  it("foto fora de 'published' some pela mesma consulta", async () => {
    const foto = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2029-01-01T00:00:00Z",
    });

    const antes = await feedDe(dados.a);
    expect(antes.itens.map((i) => i.id)).toContain(foto);

    // É o botão de pânico: uma coluna, uma escrita, e o feed acompanha sem
    // saber que ele existe.
    await admin.query("UPDATE uploads SET state = 'removida' WHERE id = $1", [foto]);

    const depois = await feedDe(dados.a);
    expect(depois.itens.map((i) => i.id)).not.toContain(foto);
  });

  it("estado desconhecido também fica de fora — o filtro é lista fechada", async () => {
    const retida = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2029-01-02T00:00:00Z",
      estado: "retida",
    });

    const pagina = await feedDe(dados.a);

    expect(pagina.itens.map((i) => i.id)).not.toContain(retida);
  });
});

describe("gate de interação", () => {
  it("gateDoEvento devolve o horário configurado", async () => {
    const gate = await comEvento(app, dados.a.eventoId, (c) => gateDoEvento(c, dados.a.eventoId));

    expect(gate?.interacaoAbreEm?.toISOString()).toBe(ABRE_EM.toISOString());
  });

  it("evento sem horário marcado fica com o gate fechado", async () => {
    const gate = await comEvento(app, dados.b.eventoId, (c) => gateDoEvento(c, dados.b.eventoId));

    expect(gate?.interacaoAbreEm).toBeNull();
  });

  it("antes do gate a contagem não existe na resposta — nem zerada", async () => {
    const foto = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2028-01-01T00:00:00Z",
    });
    await admin.query(
      "INSERT INTO reactions (event_id, upload_id, session_id, kind) VALUES ($1, $2, $3, 'coracao')",
      [dados.a.eventoId, foto, dados.a.sessaoId],
    );

    const pagina = await feedDe(dados.a, { modo: "espelho" });
    const item = pagina.itens.find((i) => i.id === foto);

    expect(item).toBeDefined();
    expect("reacoes" in item!).toBe(false);
    // O que a tela esconde, qualquer um lê com o devtools aberto. A prova é o
    // corpo serializado, não o objeto.
    expect(JSON.stringify(pagina)).not.toContain("reacoes");
  });

  it("depois do gate a contagem aparece, e é a real", async () => {
    const foto = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2028-01-02T00:00:00Z",
    });
    const { rows: outra } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'outro convidado', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );
    for (const sessao of [dados.a.sessaoId, outra[0]!.id]) {
      await admin.query(
        "INSERT INTO reactions (event_id, upload_id, session_id, kind) VALUES ($1, $2, $3, 'coracao')",
        [dados.a.eventoId, foto, sessao],
      );
    }

    const pagina = await feedDe(dados.a, { modo: "completo" });
    const item = pagina.itens.find((i) => i.id === foto);

    expect(item?.reacoes).toBe(2);
    expect(pagina.itens.every((i) => typeof i.reacoes === "number")).toBe(true);
  });

  it("depois do gate devolve a reação desta sessão", async () => {
    const foto = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2028-01-03T00:00:00Z",
    });
    await admin.query(
      "INSERT INTO reactions (event_id, upload_id, session_id, kind) VALUES ($1, $2, $3, 'estrela')",
      [dados.a.eventoId, foto, dados.a.sessaoId],
    );

    const pagina = await feedDe(dados.a, { modo: "completo", sessaoId: dados.a.sessaoId });
    const item = pagina.itens.find((i) => i.id === foto);

    expect(item?.minhaReacao).toBe("estrela");
  });

  it("antes do gate minhaReacao não existe na resposta", async () => {
    const foto = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2028-01-04T00:00:00Z",
    });
    await admin.query(
      "INSERT INTO reactions (event_id, upload_id, session_id, kind) VALUES ($1, $2, $3, 'estrela')",
      [dados.a.eventoId, foto, dados.a.sessaoId],
    );

    const pagina = await feedDe(dados.a, { modo: "espelho", sessaoId: dados.a.sessaoId });
    const item = pagina.itens.find((i) => i.id === foto);

    expect(item).toBeDefined();
    expect("minhaReacao" in item!).toBe(false);
  });

  it("depois do gate expõe sessaoAutor e minha para bloqueio", async () => {
    const foto = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2028-01-05T00:00:00Z",
    });
    const { rows: outra } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'leitor', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );

    const pagina = await feedDe(dados.a, {
      modo: "completo",
      sessaoId: outra[0]!.id,
    });
    const item = pagina.itens.find((i) => i.id === foto);

    expect(item?.sessaoAutor).toBe(dados.a.sessaoId);
    expect(item?.minha).toBe(false);
  });

  it("marca minha quando a foto é desta sessão", async () => {
    const foto = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2028-01-06T00:00:00Z",
    });

    const pagina = await feedDe(dados.a, {
      modo: "completo",
      sessaoId: dados.a.sessaoId,
    });
    const item = pagina.itens.find((i) => i.id === foto);

    expect(item?.minha).toBe(true);
  });

  it("o horário lido é o que o núcleo compara — antes fecha, depois abre", async () => {
    // A regra vive em `modoInteracao()` do @albora/core, que este pacote não
    // importa. O que se prova aqui é o insumo dela: o instante da coluna,
    // inteiro, dos dois lados da fronteira.
    const gate = await comEvento(app, dados.a.eventoId, (c) => gateDoEvento(c, dados.a.eventoId));

    expect(ANTES_DO_GATE.getTime() >= gate!.interacaoAbreEm!.getTime()).toBe(false);
    expect(DEPOIS_DO_GATE.getTime() >= gate!.interacaoAbreEm!.getTime()).toBe(true);
  });
});

describe("filtro por missão", () => {
  it("devolve só as fotos daquela missão", async () => {
    const daMissao = [
      await criarFoto({
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        criadaEm: "2026-03-01T20:00:00Z",
        missaoId: missaoA,
      }),
      await criarFoto({
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        criadaEm: "2026-03-01T20:01:00Z",
        missaoId: missaoA,
      }),
    ];
    const semMissao = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2026-03-01T20:02:00Z",
    });

    const pagina = await feedDe(dados.a, { missaoId: missaoA });
    const ids = pagina.itens.map((i) => i.id);

    expect(ids).toEqual([...daMissao].reverse());
    expect(ids).not.toContain(semMissao);
    expect(pagina.itens.every((i) => i.missaoId === missaoA)).toBe(true);
  });

  it("foto retirada não volta pelo filtro de missão", async () => {
    const retirada = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2026-03-01T20:03:00Z",
      missaoId: missaoA,
      estado: "removida",
    });

    const pagina = await feedDe(dados.a, { missaoId: missaoA });

    expect(pagina.itens.map((i) => i.id)).not.toContain(retirada);
  });
});

describe("paginação por cursor", () => {
  const instantes = [
    "2027-01-01T20:00:00Z",
    "2027-01-01T20:01:00Z",
    "2027-01-01T20:02:00Z",
    "2027-01-01T20:03:00Z",
    "2027-01-01T20:04:00Z",
  ];
  let originais: string[];

  beforeAll(async () => {
    originais = [];
    for (const criadaEm of instantes) {
      originais.push(
        await criarFoto({
          eventoId: dados.a.eventoId,
          sessaoId: dados.a.sessaoId,
          criadaEm,
          missaoId: missaoPaginacao,
        }),
      );
    }
  });

  it("mais recente primeiro", async () => {
    const pagina = await feedDe(dados.a, { missaoId: missaoPaginacao });

    expect(pagina.itens.map((i) => i.id)).toEqual([...originais].reverse());
    expect(pagina.proximoCursor).toBeNull();
  });

  it("foto que chega no meio da rolagem não repete nem some com item nenhum", async () => {
    // O caso que mata OFFSET: a festa continua enquanto a pessoa rola.
    const primeira = await feedDe(dados.a, { missaoId: missaoPaginacao, limite: 2 });
    expect(primeira.itens).toHaveLength(2);
    expect(primeira.proximoCursor).not.toBeNull();

    const intrusa = await criarFoto({
      eventoId: dados.a.eventoId,
      sessaoId: dados.a.sessaoId,
      criadaEm: "2027-01-01T20:05:00Z",
      missaoId: missaoPaginacao,
    });

    const vistos = [...primeira.itens.map((i) => i.id)];
    let cursor = primeira.proximoCursor;

    while (cursor !== null) {
      const proxima: Awaited<ReturnType<typeof listarFeed>> = await feedDe(dados.a, {
        missaoId: missaoPaginacao,
        limite: 2,
        cursor,
      });
      vistos.push(...proxima.itens.map((i) => i.id));
      cursor = proxima.proximoCursor;
    }

    expect(new Set(vistos).size).toBe(vistos.length);
    expect(vistos).toEqual([...originais].reverse());
    // Ela nasceu acima do cursor: aparece ao recarregar do topo, nunca no meio
    // da rolagem que já passou por ali.
    expect(vistos).not.toContain(intrusa);
  });

  it("empate no mesmo instante é desempatado pelo id, e nada se perde", async () => {
    const missao = await criarMissao(dados.a.eventoId, "missao.tres", 3);
    const mesmoInstante = "2027-02-02T20:00:00Z";
    const empatadas = [
      await criarFoto({
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        criadaEm: mesmoInstante,
        missaoId: missao,
      }),
      await criarFoto({
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        criadaEm: mesmoInstante,
        missaoId: missao,
      }),
      await criarFoto({
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        criadaEm: mesmoInstante,
        missaoId: missao,
      }),
    ];

    const vistos: string[] = [];
    let cursor: string | null = null;
    do {
      const pagina: Awaited<ReturnType<typeof listarFeed>> = await feedDe(dados.a, {
        missaoId: missao,
        limite: 1,
        cursor,
      });
      vistos.push(...pagina.itens.map((i) => i.id));
      cursor = pagina.proximoCursor;
    } while (cursor !== null);

    expect(new Set(vistos).size).toBe(3);
    expect([...vistos].sort()).toEqual([...empatadas].sort());
  });

  it("cursor que não decodifica é recusado antes de virar consulta", async () => {
    await expect(feedDe(dados.a, { cursor: "nao-e-um-cursor" })).rejects.toBeInstanceOf(
      ErroCursorInvalido,
    );
    await expect(
      feedDe(dados.a, { cursor: codificarCursor("2027-01-01 20:00:00+00", "'; DROP TABLE uploads; --") }),
    ).rejects.toBeInstanceOf(ErroCursorInvalido);
    await expect(
      feedDe(dados.a, { cursor: codificarCursor("ontem à noite", dados.a.uploadId) }),
    ).rejects.toBeInstanceOf(ErroCursorInvalido);
  });
});

describe("o item que a tela recebe", () => {
  it("traz a miniatura ao lado do full, derivada da chave gravada", async () => {
    const pagina = await feedDe(dados.a);
    const item = pagina.itens.find((i) => i.id === dados.a.uploadId);

    expect(item?.chaveFull).toBe(`events/${dados.a.eventoId}/2026/08/foto/full`);
    expect(item?.chaveThumb).toBe(`events/${dados.a.eventoId}/2026/08/foto/thumb`);
  });

  it("a página tem teto próprio — o cliente não escolhe quanto puxa", async () => {
    const pagina = await feedDe(dados.a, { limite: 10_000 });

    expect(pagina.itens.length).toBeLessThanOrEqual(24);
  });
});
