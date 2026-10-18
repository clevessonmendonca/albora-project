import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IdentityEditor } from "./identity-editor";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

describe("IdentityEditor, leitura da cor da festa", () => {
  it("com o modelo padrão, informa que o texto sobre a cor se ajusta", () => {
    render(
      <IdentityEditor
        eventId="evento-1"
        packId="casamento"
        initialExpectedGuests={150}
        initialTimezone="America/Sao_Paulo"
        initialIdentityTokens={{}}
        initialTitle="Festa"
      />,
    );
    expect(screen.getByText(/Boa leitura|Contraste baixo/)).toBeInTheDocument();
  });
});

function editor(tokens: Record<string, unknown> = {}) {
  return render(
    <IdentityEditor
      eventId="evento-1"
      packId="casamento"
      initialExpectedGuests={150}
      initialTimezone="America/Sao_Paulo"
      initialIdentityTokens={tokens}
      initialTitle="Ana & João"
    />,
  );
}

function corpoSalvo(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(String(init.body)) as { identityTokens: Record<string, unknown> };
}

describe("IdentityEditor, momentos e monograma", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sem edição, não grava momentos nem monograma", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    editor();
    fireEvent.click(screen.getByRole("button", { name: /Salvar/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const tokens = corpoSalvo(fetchMock).identityTokens;
    expect(tokens).not.toHaveProperty("momentos");
    expect(tokens).not.toHaveProperty("monograma");
  });

  it("renomear um momento e escolher monograma vão no PATCH, com o id do pack mantido", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    editor();
    fireEvent.change(screen.getByLabelText("Nome do momento 2"), { target: { value: "O sim" } });
    fireEvent.click(screen.getByRole("radio", { name: "A&J" }));
    fireEvent.click(screen.getByRole("button", { name: /Salvar/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const tokens = corpoSalvo(fetchMock).identityTokens as {
      momentos: { id: string; titulo: string }[];
      monograma: string;
    };
    expect(tokens.monograma).toBe("A&J");
    expect(tokens.momentos[1]).toEqual({ id: "cerimonia", titulo: "O sim" });
    expect(tokens.momentos).toHaveLength(7);
  });

  it("carrega os momentos já editados do evento e bloqueia salvar com nome repetido", () => {
    editor({ momentos: [{ id: "a", titulo: "Brinde" }, { id: "b", titulo: "Bolo" }], monograma: "" });
    expect(screen.getByLabelText("Nome do momento 1")).toHaveValue("Brinde");
    expect(screen.getByRole("radio", { name: "Sem monograma" })).toHaveAttribute("aria-checked", "true");
    fireEvent.change(screen.getByLabelText("Nome do momento 2"), { target: { value: "brinde" } });
    expect(screen.getByRole("button", { name: /Salvar/ })).toBeDisabled();
  });
});
