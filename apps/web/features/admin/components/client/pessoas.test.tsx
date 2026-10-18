import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pessoas } from "./pessoas";

const EVENTO = "11111111-1111-1111-1111-111111111111";
const ANA = { id: "s1", nome: "Ana", fotos: 3, entrouEm: "2026-10-10T20:00:00.000Z", primeiraFotoEm: null, ultimaFotoEm: null };

describe("Pessoas: perfil", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falha ao buscar as fotos mostra o erro e não 'ainda não fotografou'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    render(<Pessoas eventoId={EVENTO} pessoas={[ANA]} pessoaInicial="s1" />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não deu para carregar"));
    expect(screen.queryByText(/ainda não fotografou/)).toBeNull();
  });

  it("Tentar de novo busca outra vez e mostra as fotos", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ itens: [{ id: "f1", thumb: "/t.jpg", criadaEm: "2026-10-10T21:00:00.000Z" }] }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<Pessoas eventoId={EVENTO} pessoas={[ANA]} pessoaInicial="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(document.querySelector("img")).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
