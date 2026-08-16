import { afterEach, describe, expect, it, vi } from "vitest";
import type { VisibleSuggestion } from "@/features/music/types/visible-suggestion";
import {
  fetchMusic,
  withFailure,
  withPage,
  withAcceptedSuggestion,
  withRejectedSuggestion,
  submitSuggestion,
  initialState,
} from "./use-music";

const suggestion = (partial: Partial<VisibleSuggestion> = {}): VisibleSuggestion => ({
  provedor: "spotify",
  tipo: "faixa",
  url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
  votos: 1,
  ...partial,
});

describe("a aba nasce carregando e com o gate fechado", () => {
  it("não mostra o formulário antes da resposta — falha fechada", () => {
    const e = initialState();
    expect(e.loading).toBe(true);
    expect(e.interaction).toBe("espelho");
    expect(e.suggestions).toEqual([]);
    expect(e.capReached).toBe(false);
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
              sugestoes: [suggestion({ votos: 4 })],
              interacao: "completo",
            }),
            { status: 200 },
          ),
      ),
    );

    const r = await fetchMusic();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.page.interaction).toBe("completo");
    expect(r.page.track?.rotulo).toBe("Perfect — Ed Sheeran");
    expect(r.page.suggestions[0]?.votos).toBe(4);
    expect(fetch).toHaveBeenCalledWith("/api/music", { credentials: "same-origin" });
  });

  it("interacao ausente ou desconhecida cai em espelho", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ musica: null }), { status: 200 })),
    );
    const r = await fetchMusic();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.interaction).toBe("espelho");
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
                suggestion({ votos: 2 }),
                { provedor: "spotify" },
                null,
              ],
            }),
            { status: 200 },
          ),
      ),
    );
    const r = await fetchMusic();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.page.suggestions).toEqual([suggestion({ votos: 2 })]);
    }
  });

  it("401 e 403 na leitura são sessão; 500 é rede", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    expect(await fetchMusic()).toEqual({ ok: false, failure: "session" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 403 })));
    expect(await fetchMusic()).toEqual({ ok: false, failure: "session" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    expect(await fetchMusic()).toEqual({ ok: false, failure: "network" });
  });
});

describe("enviar POST /api/music", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manda só a url e devolve a fila atualizada", async () => {
    const fila = [suggestion({ votos: 2 })];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ aceita: true, sugestoes: fila }), { status: 200 }),
      ),
    );

    const r = await submitSuggestion("  https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT  ");
    expect(r).toEqual({ ok: true, suggestions: fila });
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

    expect(await submitSuggestion("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toEqual({
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

    expect(await submitSuggestion("https://evil.example/x")).toEqual({
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

    expect(await submitSuggestion("https://open.spotify.com/track/zzzz")).toEqual({
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
    expect(await submitSuggestion("https://open.spotify.com/track/a")).toEqual({
      ok: false,
      failure: "session",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    expect(await submitSuggestion("https://open.spotify.com/track/a")).toEqual({
      ok: false,
      failure: "session",
    });
  });
});

describe("transições da sugestão", () => {
  it("sucesso troca a fila e limpa o erro", () => {
    const withError = withRejectedSuggestion(initialState(), "validation_error");
    const ok = withAcceptedSuggestion(withError, [suggestion()]);
    expect(ok.suggestions).toHaveLength(1);
    expect(ok.suggestionError).toBeNull();
    expect(ok.submitting).toBe(false);
  });

  it("teto trava faixas novas, mas não apaga a lista", () => {
    const full = withPage(initialState(), {
      track: null,
      suggestions: [suggestion()],
      interaction: "completo",
    });
    const rejected = withRejectedSuggestion(full, "musica.teto_de_sugestoes", { teto: 3 });
    expect(rejected.capReached).toBe(true);
    expect(rejected.suggestions).toEqual(full.suggestions);
    expect(rejected.interaction).toBe("completo");
    expect(rejected.suggestionError).toMatch(/3 faixas/);
  });

  it("gate fechado no POST esconde o formulário", () => {
    const open = withPage(initialState(), {
      track: null,
      suggestions: [],
      interaction: "completo",
    });
    const closed = withRejectedSuggestion(open, "musica.interacao_fechada");
    expect(closed.interaction).toBe("espelho");
    expect(closed.suggestionError).toBe("A interação ainda não abriu");
  });

  it("falha de sessão no GET não apaga o que já estava na tela", () => {
    const full = withPage(initialState(), {
      track: { provedor: "spotify", rotulo: "X", url: "https://open.spotify.com/track/x" },
      suggestions: [suggestion()],
      interaction: "completo",
    });
    const failed = withFailure(full, "session");
    expect(failed.track).toEqual(full.track);
    expect(failed.suggestions).toEqual(full.suggestions);
    expect(failed.failure).toBe("session");
  });
});
