import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryFlow } from "./entry-flow";

/**
 * A11y e hierarquia da tela mais importante do produto (H1). Não repete o
 * caminho de sucesso presign→confirm — isso é coberto por `e2e/guest-flow.spec.ts`
 * com E2E_FULL=1; aqui o foco é o que o redesenho tocou: nome acessível,
 * consentimento navegável por teclado/leitor de tela e uma única ação primária.
 */

function renderEntryFlow() {
  return render(
    <EntryFlow
      eventoId="11111111-1111-1111-1111-111111111111"
      slug="ana-e-joao"
      nomeEvento="Ana & João"
      saudacao="Bem-vindo à festa"
      via="qr"
    />,
  );
}

describe("EntryFlow", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("campo de nome tem nome acessível explícito e recebe foco ao montar", () => {
    renderEntryFlow();

    const campoNome = screen.getByLabelText("Seu nome");
    expect(campoNome).toBeInTheDocument();
    expect(campoNome).toHaveFocus();
  });

  it("consentimento vem pré-marcado, com checkbox acessível por teclado", () => {
    renderEntryFlow();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("mostra a versão do consentimento de forma discreta, sem duplicar o texto legal por padrão", () => {
    renderEntryFlow();

    expect(screen.getByText(/Versão v1/)).toBeInTheDocument();
    // Texto completo do registro (@albora/core) só aparece sob demanda.
    expect(
      screen.queryByText(/no álbum, no feed e no telão/),
    ).not.toBeInTheDocument();
  });

  it("'Ler o texto completo' revela o texto do registro @albora/core", () => {
    renderEntryFlow();

    fireEvent.click(screen.getByRole("button", { name: "Ler o texto completo" }));

    expect(screen.getByText(/no álbum, no feed e no telão/)).toBeInTheDocument();
  });

  it("uma única ação primária: 'Fotografar' fica desabilitado até o nome ser preenchido", () => {
    renderEntryFlow();

    const botaoPrimario = screen.getByRole("button", { name: /fotografar/i });
    expect(botaoPrimario).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    expect(botaoPrimario).toBeEnabled();
  });

  it("'Prefiro não' leva à saída e 'Voltar' retorna ao formulário sem perder o nome digitado", () => {
    renderEntryFlow();

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /prefiro não/i }));

    expect(screen.getByText("Tudo bem.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Seu nome")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));

    expect(screen.getByLabelText("Seu nome")).toHaveValue("Ana");
  });

  it("mensagem de erro do envio tem role=alert (anunciada por leitor de tela)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ code: "outro" }), { status: 500 })),
    );

    renderEntryFlow();

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /fotografar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não consegui entrar");
  });

  it("link 'Ir para o conteúdo' aponta pro início da coluna de entrada", () => {
    renderEntryFlow();

    expect(screen.getByRole("link", { name: "Ir para o conteúdo" })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });
});
