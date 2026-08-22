import { describe, expect, it, vi } from "vitest";
import { fetchMusica, sugerirMusica } from "./music";
import type { GuestSession } from "./session";

const SESSAO: GuestSession = {
  token: "tok.x",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-abc",
};

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockFetchNetworkError(): typeof fetch {
  return vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
}

// ---------------------------------------------------------------------------
// fetchMusica
// ---------------------------------------------------------------------------

describe("fetchMusica", () => {
  it("retorna faixa e sugestões em resposta 200", async () => {
    const fetchFn = mockFetch({
      musica: {
        provedor: "spotify",
        rotulo: "Perfect — Ed Sheeran",
        url: "https://open.spotify.com/track/0tgVpDi06FyKpA1z0VMD4v",
        capaUrl: "https://i.scdn.co/image/abc",
      },
      sugestoes: [
        {
          id: "s1",
          provedor: "youtube",
          tipo: "faixa",
          url: "https://youtu.be/abc",
          votos: 3,
          titulo: "A Thousand Years",
          artista: "Christina Perri",
        },
      ],
      interacao: "completo",
    });

    const result = await fetchMusica(SESSAO, fetchFn);

    expect(result.faixa).toMatchObject({
      provedor: "spotify",
      rotulo: "Perfect — Ed Sheeran",
      capaUrl: "https://i.scdn.co/image/abc",
    });
    expect(result.sugestoes).toHaveLength(1);
    expect(result.sugestoes[0]).toMatchObject({
      id: "s1",
      votos: 3,
      titulo: "A Thousand Years",
    });
    expect(result.interacao).toBe("completo");
  });

  it("retorna faixa null e sugestões vazias quando campos ausentes", async () => {
    const fetchFn = mockFetch({ interacao: "espelho" });
    const result = await fetchMusica(SESSAO, fetchFn);
    expect(result.faixa).toBeNull();
    expect(result.sugestoes).toEqual([]);
    expect(result.interacao).toBe("espelho");
  });

  it("interpreta interacao desconhecida como espelho", async () => {
    const fetchFn = mockFetch({ interacao: "xpto" });
    const result = await fetchMusica(SESSAO, fetchFn);
    expect(result.interacao).toBe("espelho");
  });

  it("ignora sugestão com campo obrigatório ausente", async () => {
    const fetchFn = mockFetch({
      sugestoes: [
        { id: "s1", provedor: "spotify", tipo: "faixa", url: "https://open.spotify.com/track/x" },
        { id: "s2", provedor: "youtube", tipo: "faixa", votos: 1 },
      ],
    });
    const result = await fetchMusica(SESSAO, fetchFn);
    expect(result.sugestoes).toHaveLength(1);
    expect(result.sugestoes[0]?.id).toBe("s1");
  });

  it("retorna capaUrl null quando ausente na faixa", async () => {
    const fetchFn = mockFetch({
      musica: { provedor: "deezer", rotulo: "Ode to My Family", url: "https://deezer.com/track/1" },
    });
    const result = await fetchMusica(SESSAO, fetchFn);
    expect(result.faixa?.capaUrl).toBeNull();
  });

  it("envia eventoId e cookie corretos", async () => {
    const fetchFn = mockFetch({});
    await fetchMusica(SESSAO, fetchFn).catch(() => {});
    const [url, opts] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/api/music");
    expect(url).toContain("eventoId=ev-abc");
    expect((opts.headers as Record<string, string>)["cookie"]).toContain("tok.x");
  });

  it("lança erro em status 401", async () => {
    const fetchFn = mockFetch({ code: "sessao.invalida" }, 401);
    await expect(fetchMusica(SESSAO, fetchFn)).rejects.toThrow("music 401");
  });

  it("lança erro em status 500", async () => {
    const fetchFn = mockFetch({ code: "erro.interno" }, 500);
    await expect(fetchMusica(SESSAO, fetchFn)).rejects.toThrow("music 500");
  });
});

// ---------------------------------------------------------------------------
// sugerirMusica
// ---------------------------------------------------------------------------

describe("sugerirMusica", () => {
  it("retorna sugestões atualizadas em sucesso 200", async () => {
    const fetchFn = mockFetch({
      aceita: true,
      sugestoes: [
        {
          id: "s2",
          provedor: "spotify",
          tipo: "faixa",
          url: "https://open.spotify.com/track/abc",
          votos: 1,
          titulo: "Lemon Tree",
          artista: "Fools Garden",
        },
      ],
    });

    const result = await sugerirMusica(
      SESSAO,
      "https://open.spotify.com/track/abc",
      fetchFn,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sugestoes).toHaveLength(1);
      expect(result.sugestoes[0]?.titulo).toBe("Lemon Tree");
    }
  });

  it("envia método POST com corpo correto", async () => {
    const fetchFn = mockFetch({ aceita: true, sugestoes: [] });
    await sugerirMusica(SESSAO, "https://open.spotify.com/track/x", fetchFn);
    const [url, opts] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/api/music");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.url).toBe("https://open.spotify.com/track/x");
    expect(body.evento).toBe("ev-abc");
  });

  it("retorna erro sessao em 401", async () => {
    const fetchFn = mockFetch({ code: "sessao.invalida" }, 401);
    const result = await sugerirMusica(SESSAO, "https://open.spotify.com/track/x", fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.erro.tipo).toBe("sessao");
  });

  it("retorna erro recusada em 403 interacao_fechada", async () => {
    const fetchFn = mockFetch({ code: "musica.interacao_fechada" }, 403);
    const result = await sugerirMusica(SESSAO, "https://open.spotify.com/track/x", fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erro.tipo).toBe("recusada");
      if (result.erro.tipo === "recusada") {
        expect(result.erro.code).toBe("musica.interacao_fechada");
      }
    }
  });

  it("retorna erro recusada em 422 com code da API", async () => {
    const fetchFn = mockFetch({ code: "musica.provedor_fora_da_lista" }, 422);
    const result = await sugerirMusica(SESSAO, "https://exemplo.com", fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erro.tipo).toBe("recusada");
      if (result.erro.tipo === "recusada") {
        expect(result.erro.code).toBe("musica.provedor_fora_da_lista");
        expect(result.erro.mensagem).toContain("Link não aceito");
      }
    }
  });

  it("retorna erro sessao em musica.evento_divergente", async () => {
    const fetchFn = mockFetch({ code: "musica.evento_divergente" }, 422);
    const result = await sugerirMusica(SESSAO, "https://open.spotify.com/track/x", fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.erro.tipo).toBe("sessao");
  });

  it("retorna erro rede em falha de conexão", async () => {
    const result = await sugerirMusica(SESSAO, "https://open.spotify.com/track/x", mockFetchNetworkError());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.erro.tipo).toBe("rede");
  });

  it("retorna erro rede quando corpo não é JSON", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new SyntaxError("Invalid JSON")),
    } as unknown as Response);
    const result = await sugerirMusica(SESSAO, "https://open.spotify.com/track/x", fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.erro.tipo).toBe("rede");
  });

  it("retorna código genérico e mensagem fallback para code desconhecido", async () => {
    const fetchFn = mockFetch({ code: "erro.desconhecido" }, 422);
    const result = await sugerirMusica(SESSAO, "https://open.spotify.com/track/x", fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok && result.erro.tipo === "recusada") {
      expect(result.erro.mensagem).toBe("Não deu agora. Tente de novo.");
    }
  });
});
