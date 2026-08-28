import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";
import { useRecap } from "./use-recap";

/** Canvas não existe em jsdom — renderizador mockado na fronteira do SDK; composição visual tem cobertura própria em `packages/core`. */

vi.mock("@/lib/frame-renderer", () => ({
  loadImage: vi.fn(async () => ({ naturalWidth: 1080, naturalHeight: 1920 })),
  drawFrame: vi.fn(async () => new Blob(["quadro"], { type: "image/jpeg" })),
}));

vi.mock("@/features/my-photos/lib/recap-share", () => ({
  compartilharRecap: vi.fn(async () => "shared"),
}));

const EVENTO_ID = "evento-1";
const SESSAO_ID = "sessao-1";
const SLUG = "ana-e-joao";

function item(id: string, sobrescritas: Partial<ItemVisivel> = {}): ItemVisivel {
  return {
    id,
    chaveThumb: `events/${EVENTO_ID}/${id}/thumb`,
    chaveFull: `events/${EVENTO_ID}/${id}/full`,
    mime: "image/jpeg",
    autor: "Marina",
    legenda: null,
    lugar: null,
    criadaEm: "2026-08-15T20:00:00.000Z",
    reacoes: 0,
    ...sobrescritas,
  };
}

function contexto(id: string, sobrescritas: Record<string, unknown> = {}) {
  return {
    chaveFull: `events/${EVENTO_ID}/${id}/full`,
    chaveThumb: `events/${EVENTO_ID}/${id}/thumb`,
    mime: "image/jpeg",
    legenda: null,
    sessao: { nome: "Marina", consentimentoExterno: null },
    evento: {
      slug: SLUG,
      packId: "casamento",
      comecaEm: "2026-08-15T18:00:00.000Z",
      identityTokens: {},
      panico: false,
      modoEndurecido: false,
      compartilhamentoExternoLiberado: true,
    },
    midia: {
      removida: false,
      liberadaPeloAnfitriao: false,
      denuncias: 0,
      classificador: "limpo",
    },
    ...sobrescritas,
  };
}

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

// `URL` global aqui é stub com só `createObjectURL`/`revokeObjectURL` — `new URL(...)` quebraria o próprio teste.
function idDaQuery(url: string): string {
  const match = /uploadId=([^&]+)/.exec(url);
  return match ? match[1]! : "";
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/media/urls")) {
        const corpo = JSON.parse(String(init?.body)) as { chaves: string[] };
        return responder({
          urls: corpo.chaves.filter((chave) => chave.length > 0).map((chave) => ({
            chave,
            url: `https://r2/${chave}`,
            expiraEm: Date.now() + 3_600_000,
          })),
        });
      }
      return handler(url, init);
    }),
  );
}

describe("useRecap", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sem fotos suficientes deste evento, não fica disponível e abrir() não bate rede", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useRecap({
        eventoId: EVENTO_ID,
        sessaoId: SESSAO_ID,
        slug: SLUG,
        itens: [item("a"), item("b")],
      }),
    );

    expect(result.current.disponivel).toBe(false);

    await act(async () => {
      await result.current.abrir();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.aberto).toBe(false);
  });

  it("com consentimento externo já vigente, monta o carrossel direto", async () => {
    const consentimentoVigente = {
      versao: "externo-v1",
      em: "2026-08-15T19:00:00.000Z",
      revogadoEm: null,
      nomeNaMoldura: true,
    };

    stubFetch((url) => {
      if (url.includes("/api/share?uploadId=")) {
        const id = idDaQuery(url);
        return responder(contexto(id, { sessao: { nome: "Marina", consentimentoExterno: consentimentoVigente } }));
      }
      throw new Error(`fetch inesperado: ${url}`);
    });

    const itens = [item("a"), item("b"), item("c")];
    const { result } = renderHook(() =>
      useRecap({ eventoId: EVENTO_ID, sessaoId: SESSAO_ID, slug: SLUG, itens }),
    );

    expect(result.current.disponivel).toBe(true);
    expect(result.current.quantidade).toBe(3);

    await act(async () => {
      await result.current.abrir();
    });

    await waitFor(() => expect(result.current.aberto).toBe(true));
    expect(result.current.pedindoConsentimento).toBe(false);
    expect(result.current.quadros).toHaveLength(3);
    expect(result.current.erro).toBeNull();
  });

  it("sem consentimento externo, pede antes de montar — e monta só depois de confirmar", async () => {
    stubFetch((url, init) => {
      if (url.includes("/api/share?uploadId=")) {
        const id = idDaQuery(url);
        return responder(contexto(id));
      }
      if (url === "/api/share" && init?.method === "POST") {
        return responder({ ok: true });
      }
      throw new Error(`fetch inesperado: ${url}`);
    });

    const itens = [item("a"), item("b"), item("c")];
    const { result } = renderHook(() =>
      useRecap({ eventoId: EVENTO_ID, sessaoId: SESSAO_ID, slug: SLUG, itens }),
    );

    await act(async () => {
      await result.current.abrir();
    });

    await waitFor(() => expect(result.current.pedindoConsentimento).toBe(true));
    expect(result.current.aberto).toBe(false);

    await act(async () => {
      await result.current.confirmarConsentimento(true);
    });

    await waitFor(() => expect(result.current.aberto).toBe(true));
    expect(result.current.quadros).toHaveLength(3);
  });

  it("uma foto sem URL de mídia sai do recap sem derrubar as outras", async () => {
    stubFetch((url) => {
      if (url.includes("/api/share?uploadId=")) {
        const id = idDaQuery(url);
        return responder(
          contexto(id, {
            sessao: {
              nome: "Marina",
              consentimentoExterno: {
                versao: "externo-v1",
                em: "2026-08-15T19:00:00.000Z",
                revogadoEm: null,
                nomeNaMoldura: true,
              },
            },
            ...(id === "falha" ? { chaveFull: "" } : {}),
          }),
        );
      }
      throw new Error(`fetch inesperado: ${url}`);
    });

    const itens = [item("a"), item("falha"), item("c")];
    const { result } = renderHook(() =>
      useRecap({ eventoId: EVENTO_ID, sessaoId: SESSAO_ID, slug: SLUG, itens }),
    );

    await act(async () => {
      await result.current.abrir();
    });

    await waitFor(() => expect(result.current.aberto).toBe(true));
    expect(result.current.quadros.map((q) => q.id)).toEqual(["a", "c"]);
    expect(result.current.erro).toBeNull();
  });

  it("todas as fotos falham: erro claro, e o carrossel nunca abre", async () => {
    stubFetch((url) => {
      if (url.includes("/api/share?uploadId=")) return responder({}, 500);
      throw new Error(`fetch inesperado: ${url}`);
    });

    const itens = [item("a"), item("b"), item("c")];
    const { result } = renderHook(() =>
      useRecap({ eventoId: EVENTO_ID, sessaoId: SESSAO_ID, slug: SLUG, itens }),
    );

    await act(async () => {
      await result.current.abrir();
    });

    await waitFor(() => expect(result.current.erro).not.toBeNull());
    expect(result.current.aberto).toBe(false);
  });

  it("fechar() libera as URLs dos quadros e zera o estado", async () => {
    const consentimentoVigente = {
      versao: "externo-v1",
      em: "2026-08-15T19:00:00.000Z",
      revogadoEm: null,
      nomeNaMoldura: true,
    };

    stubFetch((url) => {
      if (url.includes("/api/share?uploadId=")) {
        const id = idDaQuery(url);
        return responder(contexto(id, { sessao: { nome: "Marina", consentimentoExterno: consentimentoVigente } }));
      }
      throw new Error(`fetch inesperado: ${url}`);
    });

    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL,
    });

    const itens = [item("a"), item("b"), item("c")];
    const { result } = renderHook(() =>
      useRecap({ eventoId: EVENTO_ID, sessaoId: SESSAO_ID, slug: SLUG, itens }),
    );

    await act(async () => {
      await result.current.abrir();
    });
    await waitFor(() => expect(result.current.aberto).toBe(true));

    act(() => {
      result.current.fechar();
    });

    expect(revokeObjectURL).toHaveBeenCalledTimes(3);
    expect(result.current.aberto).toBe(false);
    expect(result.current.quadros).toEqual([]);
  });
});
