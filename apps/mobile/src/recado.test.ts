import { describe, expect, it, vi } from "vitest";
import { buscarRecado, marcarRecadoLido, recortarTexto } from "./recado";
import type { GuestSession } from "./session";

const sessao: GuestSession = {
  token: "tok.abc",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-xyz",
};

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("buscarRecado", () => {
  it("retorna o texto quando mostrar é true", async () => {
    const fetchFn = mockFetch({
      mostrar: true,
      codigo: "recado.entregar",
      tela: { texto: "Obrigado por vir!", camera: "livre" },
    });

    const r = await buscarRecado(sessao, fetchFn);

    expect(r).toEqual({ ok: true, mostrar: true, texto: "Obrigado por vir!", audio: null });
  });

  it("extrai áudio quando a URL está presente", async () => {
    const fetchFn = mockFetch({
      mostrar: true,
      tela: {
        texto: "Obrigado!",
        camera: "livre",
        audio: { duracaoSegundos: 15, url: "https://cdn.example/recado.mp3" },
      },
    });

    const r = await buscarRecado(sessao, fetchFn);

    expect(r).toEqual({
      ok: true,
      mostrar: true,
      texto: "Obrigado!",
      audio: { duracaoSegundos: 15, url: "https://cdn.example/recado.mp3" },
    });
  });

  it("ignora áudio sem url — o texto continua", async () => {
    const fetchFn = mockFetch({
      mostrar: true,
      tela: {
        texto: "Obrigado!",
        camera: "livre",
        audio: { duracaoSegundos: 15, chave: "events/x/recado/y" },
      },
    });

    const r = await buscarRecado(sessao, fetchFn);

    expect(r).toEqual({ ok: true, mostrar: true, texto: "Obrigado!", audio: null });
  });

  it("mostrar=false devolve sem texto — a câmera segue", async () => {
    const fetchFn = mockFetch({
      mostrar: false,
      codigo: "recado.agendado",
      tela: { texto: null, camera: "livre" },
    });

    expect(await buscarRecado(sessao, fetchFn)).toEqual({
      ok: true,
      mostrar: false,
      texto: null,
      audio: null,
    });
  });

  it("401 é falha de sessão, 500 é falha de rede", async () => {
    expect(await buscarRecado(sessao, mockFetch({}, 401))).toEqual({
      ok: false,
      falha: "sessao",
    });
    expect(await buscarRecado(sessao, mockFetch({}, 500))).toEqual({
      ok: false,
      falha: "rede",
    });
  });

  it("erro de rede devolve falha sem lançar", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network"));
    expect(await buscarRecado(sessao, fetchFn)).toEqual({ ok: false, falha: "rede" });
  });

  it("envia cookie e eventoId na requisição", async () => {
    const fetchFn = mockFetch({ mostrar: false, tela: { texto: null, camera: "livre" } });

    await buscarRecado(sessao, fetchFn);

    const [url, opts] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/api/recado");
    expect(url).toContain("eventoId=ev-xyz");
    expect((opts.headers as Record<string, string>)["cookie"]).toContain("tok.abc");
  });
});

describe("marcarRecadoLido", () => {
  it("retorna true quando o servidor aceita", async () => {
    const fetchFn = mockFetch({ lido: true }, 200);
    expect(await marcarRecadoLido(sessao, fetchFn)).toBe(true);
  });

  it("retorna false em erro sem lançar", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network"));
    expect(await marcarRecadoLido(sessao, fetchFn)).toBe(false);
  });

  it("envia POST com cookie correto", async () => {
    const fetchFn = mockFetch({}, 200);

    await marcarRecadoLido(sessao, fetchFn);

    const [, opts] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(opts.method).toBe("POST");
    expect((opts.headers as Record<string, string>)["cookie"]).toContain("tok.abc");
  });
});

describe("recortarTexto", () => {
  it("texto curto passa inteiro", () => {
    expect(recortarTexto("oi", 160)).toEqual({ visivel: "oi", cortado: false });
  });

  it("texto longo ganha reticências", () => {
    const longo = "a".repeat(200);
    const r = recortarTexto(longo, 160);
    expect(r.cortado).toBe(true);
    expect(r.visivel.endsWith("…")).toBe(true);
    expect(r.visivel.length).toBeLessThanOrEqual(160);
  });
});
