import { afterEach, describe, expect, it, vi } from "vitest";
import type { VisibleSuggestion } from "@/features/music/types/visible-suggestion";
import {
  buscarMusica,
  comFalha,
  comPagina,
  comSugestaoAceita,
  comSugestaoRecusada,
  enviarSugestao,
  estadoInicial,
} from "./use-music";

const sugestao = (parcial: Partial<VisibleSuggestion> = {}): VisibleSuggestion => ({
  provedor: "spotify",
  tipo: "faixa",
  url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
  votos: 1,
  ...parcial,
});

describe("a aba nasce carregando e com o gate fechado", () => {
  it("não mostra o formulário antes da resposta — falha fechada", () => {
    const e = estadoInicial();
    expect(e.carregando).toBe(true);
    expect(e.interacao).toBe("espelho");
    expect(e.sugestoes).toEqual([]);
    expect(e.tetoAtingido).toBe(false);
  });
});

describe("buscar GET /api/music", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lê a faixa do casal, a fila e o gate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              musica: {
                provedor: "spotify",
                rotulo: "Perfect — Ed Sheeran",
                url: "https://open.spotify.com/track/0",
              },
              sugestoes: [sugestao({ votos: 4 })],
              interacao: "completo",
            }),
            { status: 200 },
          ),
      ),
    );

    const r = await buscarMusica();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pagina.interacao).toBe("completo");
    expect(r.pagina.musica?.rotulo).toBe("Perfect — Ed Sheeran");
    expect(r.pagina.sugestoes[0]?.votos).toBe(4);
    expect(fetch).toHaveBeenCalledWith("/api/music", { credentials: "same-origin" });
  });

  it("interacao ausente ou desconhecida cai em espelho", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ musica: null }), { status: 200 })),
    );
    const r = await buscarMusica();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pagina.interacao).toBe("espelho");
  });

  it("item malformado na fila some, o resto fica", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              musica: null,
              interacao: "completo",
              sugestoes: [
                sugestao({ votos: 2 }),
                { provedor: "spotify" },
                null,
              ],
            }),
            { status: 200 },
          ),
      ),
    );
    const r = await buscarMusica();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pagina.sugestoes).toEqual([sugestao({ votos: 2 })]);
    }
  });

  it("401 e 403 na leitura são sessão; 500 é rede", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    expect(await buscarMusica()).toEqual({ ok: false, falha: "sessao" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 403 })));
    expect(await buscarMusica()).toEqual({ ok: false, falha: "sessao" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    expect(await buscarMusica()).toEqual({ ok: false, falha: "rede" });
  });
});

describe("enviar POST /api/music", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manda só a url e devolve a fila atualizada", async () => {
    const fila = [sugestao({ votos: 2 })];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ aceita: true, sugestoes: fila }), { status: 200 }),
      ),
    );

    const r = await enviarSugestao("  https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT  ");
    expect(r).toEqual({ ok: true, sugestoes: fila });
    expect(fetch).toHaveBeenCalledWith("/api/music", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "  https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT  ",
      }),
    });
  });

  it("403 de gate não é sessão — o cliente ramifica no code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ code: "musica.interacao_fechada", message: "A interação ainda não abriu" }),
            { status: 403 },
          ),
      ),
    );

    expect(await enviarSugestao("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toEqual({
      ok: false,
      code: "musica.interacao_fechada",
    });
  });

  it("link recusado ramifica no code, não na mensagem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: "musica.provedor_fora_da_lista",
              message: "Link não aceito",
              details: { host: "evil.example" },
            }),
            { status: 422 },
          ),
      ),
    );

    expect(await enviarSugestao("https://evil.example/x")).toEqual({
      ok: false,
      code: "musica.provedor_fora_da_lista",
      details: { host: "evil.example" },
    });
  });

  it("teto traz o detalhe para a copy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: "musica.teto_de_sugestoes",
              message: "Sugestão recusada",
              details: { teto: 3 },
            }),
            { status: 422 },
          ),
      ),
    );

    expect(await enviarSugestao("https://open.spotify.com/track/zzzz")).toEqual({
      ok: false,
      code: "musica.teto_de_sugestoes",
      details: { teto: 3 },
    });
  });

  it("evento divergente é sessão; 401 também", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: "musica.evento_divergente" }), { status: 403 }),
      ),
    );
    expect(await enviarSugestao("https://open.spotify.com/track/a")).toEqual({
      ok: false,
      falha: "sessao",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    expect(await enviarSugestao("https://open.spotify.com/track/a")).toEqual({
      ok: false,
      falha: "sessao",
    });
  });
});

describe("transições da sugestão", () => {
  it("sucesso troca a fila e limpa o erro", () => {
    const comErro = comSugestaoRecusada(estadoInicial(), "validation_error");
    const ok = comSugestaoAceita(comErro, [sugestao()]);
    expect(ok.sugestoes).toHaveLength(1);
    expect(ok.erroSugestao).toBeNull();
    expect(ok.enviando).toBe(false);
  });

  it("teto trava faixas novas, mas não apaga a lista", () => {
    const cheia = comPagina(estadoInicial(), {
      musica: null,
      sugestoes: [sugestao()],
      interacao: "completo",
    });
    const recusada = comSugestaoRecusada(cheia, "musica.teto_de_sugestoes", { teto: 3 });
    expect(recusada.tetoAtingido).toBe(true);
    expect(recusada.sugestoes).toEqual(cheia.sugestoes);
    expect(recusada.interacao).toBe("completo");
    expect(recusada.erroSugestao).toMatch(/3 faixas/);
  });

  it("gate fechado no POST esconde o formulário", () => {
    const aberta = comPagina(estadoInicial(), {
      musica: null,
      sugestoes: [],
      interacao: "completo",
    });
    const fechada = comSugestaoRecusada(aberta, "musica.interacao_fechada");
    expect(fechada.interacao).toBe("espelho");
    expect(fechada.erroSugestao).toBe("A interação ainda não abriu");
  });

  it("falha de sessão no GET não apaga o que já estava na tela", () => {
    const cheia = comPagina(estadoInicial(), {
      musica: { provedor: "spotify", rotulo: "X", url: "https://open.spotify.com/track/x" },
      sugestoes: [sugestao()],
      interacao: "completo",
    });
    const falhou = comFalha(cheia, "sessao");
    expect(falhou.musica).toEqual(cheia.musica);
    expect(falhou.sugestoes).toEqual(cheia.sugestoes);
    expect(falhou.falha).toBe("sessao");
  });
});
