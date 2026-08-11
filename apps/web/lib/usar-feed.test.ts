import { afterEach, describe, expect, it, vi } from "vitest";
import { FOLGA_DE_RENOVACAO_MS, type UrlDeMidia } from "./midia";
import {
  buscarPagina,
  chavesSemUrl,
  comFalha,
  comFalhaDeMidia,
  comPagina,
  comUrls,
  estadoInicial,
  reiniciado,
  type EstadoFeed,
  type ItemVisivel,
} from "./usar-feed";

const item = (id: string): ItemVisivel => ({
  id,
  chaveThumb: `events/e/${id}/thumb`,
  chaveFull: `events/e/${id}/full`,
  autor: "Ana",
  legenda: null,
  lugar: null,
  criadaEm: "2026-08-11T23:10:00.000Z",
});

const url = (chave: string, expiraEm: number, valor = `https://r2/${chave}`): UrlDeMidia => ({
  chave,
  url: valor,
  expiraEm,
});

describe("a primeira tela já vem carregando", () => {
  it("o estado inicial é o que desenha a moldura, não um vazio", () => {
    const e = estadoInicial();

    expect(e.carregando).toBe(true);
    expect(e.jaCarregou).toBe(false);
    expect(e.itens).toEqual([]);
  });

  it("trocar de filtro não pisca vazio antes da resposta", () => {
    const cheio = comPagina(estadoInicial(), { itens: [item("a")], proximoCursor: null });

    expect(reiniciado(cheio).carregando).toBe(true);
    expect(reiniciado(cheio).jaCarregou).toBe(false);
  });
});

describe("paginação por cursor", () => {
  it("empilha a página nova depois do que já está na tela", () => {
    const um = comPagina(estadoInicial(), { itens: [item("a"), item("b")], proximoCursor: "c1" });
    const dois = comPagina(um, { itens: [item("c")], proximoCursor: "c2" });

    expect(dois.itens.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(dois.cursor).toBe("c2");
    expect(dois.fim).toBe(false);
  });

  it("cursor nulo é o fim da lista", () => {
    const e = comPagina(estadoInicial(), { itens: [item("a")], proximoCursor: null });

    expect(e.fim).toBe(true);
    expect(e.cursor).toBeNull();
  });

  it("a mesma página chegando duas vezes não duplica item", () => {
    const um = comPagina(estadoInicial(), { itens: [item("a"), item("b")], proximoCursor: "c1" });
    const dois = comPagina(um, { itens: [item("b"), item("c")], proximoCursor: "c2" });

    expect(dois.itens.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("página sem item novo preserva a referência da lista", () => {
    const um = comPagina(estadoInicial(), { itens: [item("a")], proximoCursor: "c1" });
    const dois = comPagina(um, { itens: [item("a")], proximoCursor: null });

    expect(dois.itens).toBe(um.itens);
  });
});

describe("falha não joga a rolagem para o topo", () => {
  it("cursor recusado mantém tudo que já está na tela", () => {
    const cheio = comPagina(estadoInicial(), { itens: [item("a"), item("b")], proximoCursor: "c1" });
    const falhou = comFalha(cheio, "cursor");

    expect(falhou.itens.map((i) => i.id)).toEqual(["a", "b"]);
    expect(falhou.falha).toBe("cursor");
    expect(falhou.carregando).toBe(false);
  });

  it("recomeçar é explícito, e guarda o cache de URLs", () => {
    const cheio = comUrls(
      comPagina(estadoInicial(), { itens: [item("a")], proximoCursor: "c1" }),
      new Map([["events/e/a/thumb", url("events/e/a/thumb", 9_000_000)]]),
    );
    const zerado = reiniciado(cheio);

    expect(zerado.itens).toEqual([]);
    expect(zerado.cursor).toBeNull();
    expect(zerado.urls.size).toBe(1);
  });
});

describe("URLs de mídia em lote", () => {
  const comItens = (ids: string[]): EstadoFeed =>
    comPagina(estadoInicial(), { itens: ids.map(item), proximoCursor: null });

  it("pede só as chaves que ainda não têm URL viva", () => {
    const e = comUrls(
      comItens(["a", "b"]),
      new Map([["events/e/a/thumb", url("events/e/a/thumb", 9_000_000)]]),
    );

    expect(chavesSemUrl(e, 1_000_000)).toEqual(["events/e/b/thumb"]);
  });

  it("renova antes de a URL vencer, não no instante", () => {
    const agora = 1_000_000;
    const quaseVencida = agora + FOLGA_DE_RENOVACAO_MS - 1;
    const e = comUrls(
      comItens(["a"]),
      new Map([["events/e/a/thumb", url("events/e/a/thumb", quaseVencida)]]),
    );

    expect(chavesSemUrl(e, agora)).toEqual(["events/e/a/thumb"]);
  });

  it("não repete chave quando duas fotos compartilham a miniatura", () => {
    const repetida: ItemVisivel[] = [
      { ...item("a"), chaveThumb: "events/e/x/thumb" },
      { ...item("b"), chaveThumb: "events/e/x/thumb" },
    ];
    const e = comPagina(estadoInicial(), { itens: repetida, proximoCursor: null });

    expect(chavesSemUrl(e, 1_000_000)).toEqual(["events/e/x/thumb"]);
  });

  it("a janela do visualizador entra no mesmo lote das miniaturas", () => {
    const e = comItens(["a"]);

    expect(chavesSemUrl(e, 1_000_000, ["events/e/a/full"])).toEqual([
      "events/e/a/thumb",
      "events/e/a/full",
    ]);
  });

  it("chave da janela que já tem URL viva não volta ao servidor", () => {
    const e = comUrls(
      comItens(["a"]),
      new Map([["events/e/a/full", url("events/e/a/full", 9_000_000)]]),
    );

    expect(chavesSemUrl(e, 1_000_000, ["events/e/a/full"])).toEqual(["events/e/a/thumb"]);
  });

  it("miniatura pedida pelas duas vias vira uma chave só", () => {
    const e = comItens(["a"]);

    expect(chavesSemUrl(e, 1_000_000, ["events/e/a/thumb"])).toEqual(["events/e/a/thumb"]);
  });

  it("sem janela aberta o lote é só o das miniaturas", () => {
    const e = comItens(["a"]);

    expect(chavesSemUrl(e, 1_000_000)).toEqual(["events/e/a/thumb"]);
  });

  it("resposta sem informação nova devolve o mesmo estado", () => {
    const mesma = new Map([["events/e/a/thumb", url("events/e/a/thumb", 9_000_000)]]);
    const um = comUrls(comItens(["a"]), mesma);
    const dois = comUrls(um, new Map(mesma));

    expect(dois).toBe(um);
  });

  it("URL renovada entra no lugar da antiga", () => {
    const um = comUrls(
      comItens(["a"]),
      new Map([["events/e/a/thumb", url("events/e/a/thumb", 2_000_000)]]),
    );
    const dois = comUrls(
      um,
      new Map([["events/e/a/thumb", url("events/e/a/thumb", 9_000_000, "https://r2/novo")]]),
    );

    expect(dois).not.toBe(um);
    expect(dois.urls.get("events/e/a/thumb")?.url).toBe("https://r2/novo");
  });
});

describe("degradação quando a rota de mídia não responde", () => {
  it("marca uma vez e depois devolve o mesmo estado", () => {
    const um = comFalhaDeMidia(estadoInicial());
    const dois = comFalhaDeMidia(um);

    expect(um.midiaIndisponivel).toBe(true);
    expect(dois).toBe(um);
  });

  it("a marca sai quando a mídia volta", () => {
    const caiu = comFalhaDeMidia(
      comPagina(estadoInicial(), { itens: [item("a")], proximoCursor: null }),
    );
    const voltou = comUrls(
      caiu,
      new Map([["events/e/a/thumb", url("events/e/a/thumb", 9_000_000)]]),
    );

    expect(voltou.midiaIndisponivel).toBe(false);
  });

  it("falha de mídia não derruba os itens do feed", () => {
    const caiu = comFalhaDeMidia(
      comPagina(estadoInicial(), { itens: [item("a")], proximoCursor: null }),
    );

    expect(caiu.itens).toHaveLength(1);
  });
});

describe("contrato com a rota do feed", () => {
  afterEach(() => vi.unstubAllGlobals());

  // Os argumentos entram na assinatura porque o teste confere a URL pedida:
  // um `vi.fn()` sem parâmetros tipa `mock.calls` como tupla vazia, e aí
  // `calls[0][0]` não compila.
  const responder = (corpo: unknown, status = 200) =>
    vi.fn<(...args: unknown[]) => Promise<Response>>(() =>
      Promise.resolve(new Response(JSON.stringify(corpo), { status })),
    );

  it("manda missão e cursor na querystring, e nunca um deslocamento", async () => {
    const buscar = responder({ itens: [], proximoCursor: null });
    vi.stubGlobal("fetch", buscar);

    await buscarPagina("11111111-1111-1111-1111-111111111111", "Y3Vyc29y");

    const pedido = String(buscar.mock.calls[0]?.[0]);
    expect(pedido).toContain("missao=11111111-1111-1111-1111-111111111111");
    expect(pedido).toContain("cursor=Y3Vyc29y");
    expect(pedido).not.toContain("offset");
  });

  it("sem filtro e sem cursor, pede a rota limpa", async () => {
    const buscar = responder({ itens: [], proximoCursor: null });
    vi.stubGlobal("fetch", buscar);

    await buscarPagina(null, null);

    expect(String(buscar.mock.calls[0]?.[0])).toBe("/api/feed");
  });

  it("projeta o item sem a contagem, mesmo quando ela vem na resposta", async () => {
    vi.stubGlobal(
      "fetch",
      responder({
        itens: [
          {
            id: "a",
            chaveThumb: "events/e/a/thumb",
            chaveFull: "events/e/a/full",
            autor: "Ana",
            legenda: "no brinde",
            lugar: "Pista",
            criadaEm: "2026-08-11T23:10:00.000Z",
            missaoId: "11111111-1111-1111-1111-111111111111",
            reacoes: 12,
          },
        ],
        proximoCursor: "c1",
      }),
    );

    const r = await buscarPagina(null, null);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pagina.itens[0]).toEqual({
      id: "a",
      chaveThumb: "events/e/a/thumb",
      chaveFull: "events/e/a/full",
      autor: "Ana",
      legenda: "no brinde",
      lugar: "Pista",
      criadaEm: "2026-08-11T23:10:00.000Z",
    });
  });

  it("instante ilegível não derruba a foto do feed", async () => {
    vi.stubGlobal(
      "fetch",
      responder({
        itens: [{ id: "a", chaveThumb: "t", chaveFull: "f", autor: "Ana", legenda: null }],
        proximoCursor: null,
      }),
    );

    const r = await buscarPagina(null, null);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pagina.itens[0]?.criadaEm).toBe("");
    expect(r.pagina.itens[0]?.lugar).toBeNull();
  });

  it("422 de cursor vira falha de cursor, não de rede", async () => {
    vi.stubGlobal("fetch", responder({ code: "feed.cursor_invalido" }, 422));

    const r = await buscarPagina(null, "quebrado");

    expect(r).toEqual({ ok: false, falha: "cursor" });
  });

  it("422 de outro campo não vira falha de cursor", async () => {
    vi.stubGlobal("fetch", responder({ code: "validation_error" }, 422));

    const r = await buscarPagina(null, null);

    expect(r).toEqual({ ok: false, falha: "rede" });
  });

  it("401 e 403 viram falha de sessão", async () => {
    vi.stubGlobal("fetch", responder({ code: "sessao.invalida" }, 401));
    expect(await buscarPagina(null, null)).toEqual({ ok: false, falha: "sessao" });

    vi.stubGlobal("fetch", responder({ code: "feed.evento_divergente" }, 403));
    expect(await buscarPagina(null, null)).toEqual({ ok: false, falha: "sessao" });
  });

  it("rede caída não estoura para a tela", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));

    expect(await buscarPagina(null, null)).toEqual({ ok: false, falha: "rede" });
  });

  it("corpo que não é JSON não estoura para a tela", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("<html>", { status: 200 }))));

    expect(await buscarPagina(null, null)).toEqual({ ok: false, falha: "rede" });
  });
});
