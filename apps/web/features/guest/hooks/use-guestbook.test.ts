import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buscarRecado,
  comFalha,
  comTela,
  dispensar,
  estadoInicial,
  recortarTexto,
} from "./use-guestbook";

describe("o recado nasce carregando e nao segura a camera", () => {
  it("a primeira tela nao desenha o card — enriquecimento, nunca caminho critico", () => {
    const e = estadoInicial();
    expect(e.carregando).toBe(true);
    expect(e.mostrar).toBe(false);
    expect(e.texto).toBeNull();
    expect(e.audio).toBeNull();
  });
});

describe("buscar GET /api/recado", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve o texto quando a entrega manda mostrar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            mostrar: true,
            codigo: "recado.entregar",
            tela: { texto: "Obrigado por vir.", camera: "livre" },
          }),
          { status: 200 },
        ),
      ),
    );

    const r = await buscarRecado();

    expect(r).toEqual({ ok: true, mostrar: true, texto: "Obrigado por vir.", audio: null });
    expect(fetch).toHaveBeenCalledWith("/api/recado", { credentials: "same-origin" });
  });

  it("traz o player quando a entrega manda audio com url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            mostrar: true,
            codigo: "recado.entregar",
            tela: {
              texto: "Obrigado por vir.",
              camera: "livre",
              audio: { duracaoSegundos: 20, url: "https://cdn.example/recado" },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    expect(await buscarRecado()).toEqual({
      ok: true,
      mostrar: true,
      texto: "Obrigado por vir.",
      audio: { duracaoSegundos: 20, url: "https://cdn.example/recado" },
    });
  });

  it("audio sem url nao segura o card — o texto continua", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            mostrar: true,
            codigo: "recado.entregar",
            tela: {
              texto: "Obrigado por vir.",
              camera: "livre",
              audio: { duracaoSegundos: 20, chave: "events/x/recado/y" },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    expect(await buscarRecado()).toEqual({
      ok: true,
      mostrar: true,
      texto: "Obrigado por vir.",
      audio: null,
    });
  });

  it("agendado, lido ou inexistente nao aparecem — a camera segue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            mostrar: false,
            codigo: "recado.agendado",
            tela: { texto: null, camera: "livre" },
          }),
          { status: 200 },
        ),
      ),
    );

    expect(await buscarRecado()).toEqual({ ok: true, mostrar: false, texto: null, audio: null });
  });

  it("401 e sessao, o resto e rede — e rede nao trava o resto do app", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    expect(await buscarRecado()).toEqual({ ok: false, falha: "sessao" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    expect(await buscarRecado()).toEqual({ ok: false, falha: "rede" });
  });
});

describe("transicoes", () => {
  it("falha nao inventa um recado", () => {
    const falhou = comFalha(estadoInicial(), "rede");
    expect(falhou.mostrar).toBe(false);
    expect(falhou.texto).toBeNull();
  });

  it("dispensar esconde e nao volta nesta sessao de tela", () => {
    const visivel = comTela(estadoInicial(), true, "oi", {
      duracaoSegundos: 8,
      url: "https://cdn.example/recado",
    });
    const sumiu = dispensar(visivel);
    expect(sumiu.mostrar).toBe(false);
    expect(sumiu.texto).toBeNull();
    expect(sumiu.audio).toBeNull();
  });
});

describe("o texto cabe de pe, no escuro", () => {
  it("curto passa inteiro; longo ganha reticencias", () => {
    expect(recortarTexto("oi", 160)).toEqual({ visivel: "oi", cortado: false });
    const longo = "a".repeat(200);
    const r = recortarTexto(longo, 160);
    expect(r.cortado).toBe(true);
    expect(r.visivel.endsWith("…")).toBe(true);
    expect(r.visivel.length).toBeLessThanOrEqual(160);
  });
});
