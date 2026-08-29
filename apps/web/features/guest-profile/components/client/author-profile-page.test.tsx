import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthorProfilePage } from "./author-profile-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/e/ana-e-joao",
}));

/** Smoke da tela autor clicável — não testa curtida/comentário porque a tela não os oferece (só leitura). */

const AUTOR_ID = "11111111-1111-1111-1111-111111111111";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

function stubFetch(perfil: unknown, perfilStatus = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/media/urls")) {
        return responder({
          urls: [{ chave: "events/e/foto/thumb", url: "https://r2/foto-thumb.jpg", expiraEm: Date.now() + 3_600_000 }],
        });
      }
      if (url.includes("/api/guests/")) {
        return responder(perfil, perfilStatus);
      }
      throw new Error(`fetch inesperado: ${url}`);
    }),
  );
}

describe("AuthorProfilePage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("monta, busca o perfil e mostra o nome do autor e a foto dele", async () => {
    stubFetch({
      nome: "Marina",
      totalFotos: 1,
      totalCurtidas: 3,
      itens: [
        {
          id: "foto-1",
          chaveThumb: "events/e/foto/thumb",
          chaveFull: "events/e/foto/full",
          mime: "image/jpeg",
          autor: "Marina",
          legenda: null,
          lugar: null,
          criadaEm: "2026-08-11T23:10:00.000Z",
          reacoes: 3,
          minhaReacao: null,
        },
      ],
      proximoCursor: null,
    });

    render(<AuthorProfilePage slug="ana-e-joao" autorId={AUTOR_ID} />);

    await waitFor(() => {
      expect(screen.getAllByText("Marina").length).toBeGreaterThan(0);
    });

    expect(await screen.findByLabelText("Foto de Marina, 1 de 1")).toBeInTheDocument();
    expect(screen.getByText("Fotos")).toBeInTheDocument();
    expect(screen.getByText("Curtidas")).toBeInTheDocument();
  });

  it("perfil não encontrado (id de outro evento, bloqueado, ou antes do gate) mostra o estado terminal", async () => {
    stubFetch({ code: "perfil.nao_encontrado" }, 404);

    render(<AuthorProfilePage slug="ana-e-joao" autorId={AUTOR_ID} />);

    expect(await screen.findByText("Esse perfil não está disponível")).toBeInTheDocument();
    expect(screen.queryByAltText(/Foto de/)).not.toBeInTheDocument();
  });

  it("sem foto nenhuma, mostra o estado vazio em vez do card de carregamento parado", async () => {
    stubFetch({ nome: "Marina", itens: [], proximoCursor: null });

    render(<AuthorProfilePage slug="ana-e-joao" autorId={AUTOR_ID} />);

    expect(await screen.findByText("Ainda não tem foto aqui.")).toBeInTheDocument();
  });
});
