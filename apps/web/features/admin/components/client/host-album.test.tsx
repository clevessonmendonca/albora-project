import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostAlbum } from "./host-album";

type Chamada = { midiaId: string; acao: string };

function foto(id: string, destacada = false) {
  return {
    id,
    missaoId: null,
    lugarId: null,
    reacoes: 0,
    destacada,
    criadaEm: "2026-09-20T20:00:00.000Z",
    thumb: `https://exemplo/${id}`,
  };
}

/** Devolve as três fotos no GET e registra o que o PATCH recebeu. */
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
    expect(chamadas).toEqual([{ midiaId: "b", acao: "ocultar" }]);
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
    expect(chamadas.map((c) => c.acao)).toEqual(["ocultar", "reexibir"]);

    // A foto "b" voltou para o meio: se tivesse ido para o fim, a segunda
    // miniatura seria a "c".
    const segunda = screen.getByRole("button", { name: /Foto 2 de 3/ });
    expect(segunda.querySelector("img")?.getAttribute("src")).toBe("https://exemplo/b");
  });

  it("remover exige confirmação e não oferece desfazer", async () => {
    const chamadas: Chamada[] = [];
    vi.stubGlobal("fetch", montarFetch(chamadas));

    await abrirSegundaFoto();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));

    // Enquanto não confirma, nada foi enviado.
    expect(chamadas).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Remover de vez" }));

    await waitFor(() => {
      expect(chamadas).toEqual([{ midiaId: "b", acao: "remover" }]);
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
    expect(chamadas).toEqual([{ midiaId: "b", acao: "destacar" }]);
    expect(screen.getByRole("button", { name: /Foto 2 de 3.*destacada/ })).toBeTruthy();
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
