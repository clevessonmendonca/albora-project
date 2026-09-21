import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostAlbum } from "./host-album";

type Chamada = { midiaId?: string; acao: string };

function foto(id: string, destacada = false) {
  return {
    id,
    sessaoId: `s-${id}`,
    missaoId: null,
    lugarId: null,
    reacoes: 0,
    destacada,
    criadaEm: "2026-09-20T20:00:00.000Z",
    thumb: `https://exemplo/${id}`,
  };
}

/**
 * Devolve as três fotos no GET e registra o que o PATCH recebeu. A marca de
 * leitura ("visto") entra aqui junto — os testes de ação filtram por
 * `midiaId` para não misturar contabilidade com decisão sobre foto.
 */
function montarFetch(chamadas: Chamada[]) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      chamadas.push(JSON.parse(String(init.body)) as Chamada);
      return new Response(JSON.stringify({}), { status: 200 });
    }
    const destaques = String(url).includes("aba=destaques");
    const itens = destaques ? [] : [foto("a"), foto("b"), foto("c")];
    return new Response(JSON.stringify({ itens }), { status: 200 });
  });
}

/** Só o que age sobre uma foto. */
function acoesEmFoto(chamadas: Chamada[]): Chamada[] {
  return chamadas.filter((c) => c.midiaId !== undefined);
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function abrirSegundaFoto() {
  render(<HostAlbum eventoId="evt" canExport={false} />);
  const alvo = await screen.findByRole("button", { name: /Foto 2 de 3/ });
  fireEvent.click(alvo);
}

describe("HostAlbum — ocultar é reversível, remover não", () => {
  it("ocultar tira da grade e oferece desfazer", async () => {
    const chamadas: Chamada[] = [];
    vi.stubGlobal("fetch", montarFetch(chamadas));

    await abrirSegundaFoto();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Desfazer" })).toBeTruthy();
    });
    expect(acoesEmFoto(chamadas)).toEqual([{ midiaId: "b", acao: "ocultar" }]);
    expect(screen.queryByRole("button", { name: /Foto 3 de 3/ })).toBeNull();
  });

  it("desfazer recoloca a foto na posição original, não no fim", async () => {
    const chamadas: Chamada[] = [];
    vi.stubGlobal("fetch", montarFetch(chamadas));

    await abrirSegundaFoto();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desfazer" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Foto 3 de 3/ })).toBeTruthy();
    });
    expect(acoesEmFoto(chamadas).map((c) => c.acao)).toEqual(["ocultar", "reexibir"]);

    // A foto "b" voltou para o meio: se tivesse ido para o fim, a segunda
    // miniatura seria a "c".
    const segunda = screen.getByRole("button", { name: /Foto 2 de 3/ });
    expect(segunda.querySelector("img")?.getAttribute("src")).toBe("https://exemplo/b");
  });

  it("desfazer devolve pelo vizinho, mesmo se a lista recarregou no meio", async () => {
    const chamadas: Chamada[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        chamadas.push(JSON.parse(String(init.body)) as Chamada);
        return new Response(JSON.stringify({}), { status: 200 });
      }
      // A lista volta do servidor com uma foto nova no começo — o índice
      // guardado no ocultar apontaria para o lugar errado.
      const recarregou = chamadas.some((c) => c.acao === "ocultar");
      const itens = recarregou
        ? [foto("nova"), foto("a"), foto("c")]
        : [foto("a"), foto("b"), foto("c")];
      return new Response(JSON.stringify({ itens }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await abrirSegundaFoto();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    fireEvent.click(await screen.findByRole("button", { name: /Atualizar/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Desfazer" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Foto 3 de 4/ })).toBeTruthy();
    });
    // "b" volta logo depois de "a", que era o vizinho de cima quando sumiu.
    const terceira = screen.getByRole("button", { name: /Foto 3 de 4/ });
    expect(terceira.querySelector("img")?.getAttribute("src")).toBe("https://exemplo/b");
  });

  it("remover exige confirmação e não oferece desfazer", async () => {
    const chamadas: Chamada[] = [];
    vi.stubGlobal("fetch", montarFetch(chamadas));

    await abrirSegundaFoto();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));

    // Enquanto não confirma, nada foi enviado.
    expect(acoesEmFoto(chamadas)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Remover de vez" }));

    await waitFor(() => {
      expect(acoesEmFoto(chamadas)).toEqual([{ midiaId: "b", acao: "remover" }]);
    });
    expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
  });

  it("destacar marca a foto sem tirá-la da grade", async () => {
    const chamadas: Chamada[] = [];
    vi.stubGlobal("fetch", montarFetch(chamadas));

    await abrirSegundaFoto();
    fireEvent.click(screen.getByRole("button", { name: "Destacar" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tirar destaque" })).toBeTruthy();
    });
    expect(acoesEmFoto(chamadas)).toEqual([{ midiaId: "b", acao: "destacar" }]);
    expect(screen.getByRole("button", { name: /Foto 2 de 3.*destacada/ })).toBeTruthy();
  });
});

describe("HostAlbum — marca de leitura", () => {
  it("abrir Todas carimba o álbum como visto, para a Home saber o que é novo", async () => {
    const chamadas: Chamada[] = [];
    vi.stubGlobal("fetch", montarFetch(chamadas));

    render(<HostAlbum eventoId="evt" canExport={false} />);
    await waitFor(() => {
      expect(chamadas.some((c) => c.acao === "visto")).toBe(true);
    });
  });

  it("aba Destaques não carimba: ver as favoritas não é ver o que chegou", async () => {
    const chamadas: Chamada[] = [];
    vi.stubGlobal("fetch", montarFetch(chamadas));

    render(<HostAlbum eventoId="evt" canExport={false} aba="destaques" />);
    await waitFor(() => {
      expect(screen.getByText("Nenhuma foto destacada ainda.")).toBeTruthy();
    });
    expect(chamadas.some((c) => c.acao === "visto")).toBe(false);
  });
});

describe("HostAlbum — aba Destaques", () => {
  it("pede só as destacadas e explica como destacar quando não há nenhuma", async () => {
    const chamadas: Chamada[] = [];
    const fetchMock = montarFetch(chamadas);
    vi.stubGlobal("fetch", fetchMock);

    render(<HostAlbum eventoId="evt" canExport aba="destaques" />);

    await waitFor(() => {
      expect(screen.getByText("Nenhuma foto destacada ainda.")).toBeTruthy();
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("aba=destaques");
    // As caixas de export são da aba Todas — aqui só atrapalhariam.
    expect(screen.queryByText("O livro")).toBeNull();
  });
});
