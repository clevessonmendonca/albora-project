import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryFlow } from "./entry-flow";

/**
 * A11y e hierarquia da tela mais importante do produto (H1). Não repete o
 * caminho de sucesso presign→confirm — isso é coberto por `e2e/guest-flow.spec.ts`
 * com E2E_FULL=1; aqui o foco é o que o redesenho tocou: chegada emocional,
 * identidade só depois de "Entrar na festa", consentimento navegável e uma
 * única ação primária por tela.
 */

function renderEntryFlow() {
  return render(
    <EntryFlow
      eventoId="11111111-1111-1111-1111-111111111111"
      slug="ana-e-joao"
      nomeEvento="Ana & João"
      saudacao="Bem-vindo à festa"
      via="qr"
      comecaEm="2026-10-12T19:00:00.000Z"
    />,
  );
}

/** Avança da chegada para a tela de identidade (nome + consentimento). */
function entrarNaFesta() {
  fireEvent.click(screen.getByRole("button", { name: "Entrar na festa" }));
}

describe("EntryFlow", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("chega emocional: convite + nome do evento + entrar, sem pedir nada ainda", () => {
    renderEntryFlow();

    expect(screen.getByText("Você foi convidado para")).toBeInTheDocument();
    expect(screen.getByText("Ana & João")).toBeInTheDocument();
    expect(screen.getByText("Sem app · sem cadastro · sem baixar nada")).toBeInTheDocument();
    // Identidade não é pedida na chegada.
    expect(screen.queryByLabelText("Seu nome")).not.toBeInTheDocument();
  });

  it("campo de nome só aparece (e recebe foco) depois de 'Entrar na festa'", () => {
    renderEntryFlow();
    entrarNaFesta();

    const campoNome = screen.getByLabelText("Seu nome");
    expect(campoNome).toBeInTheDocument();
    expect(campoNome).toHaveFocus();
  });

  it("consentimento vem pré-marcado, com checkbox acessível por teclado", () => {
    renderEntryFlow();
    entrarNaFesta();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("mostra a versão do consentimento sem duplicar o texto legal por padrão", () => {
    renderEntryFlow();
    entrarNaFesta();

    expect(screen.getByText(/Versão v1/)).toBeInTheDocument();
    expect(screen.queryByText(/no álbum, no feed e no telão/)).not.toBeInTheDocument();
  });

  it("'Ver detalhes' revela o texto do registro @albora/core", () => {
    renderEntryFlow();
    entrarNaFesta();

    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
    expect(screen.getByText(/no álbum, no feed e no telão/)).toBeInTheDocument();
  });

  it("uma única ação primária: 'Continuar' fica desabilitado até o nome ser preenchido", () => {
    renderEntryFlow();
    entrarNaFesta();

    const botaoPrimario = screen.getByRole("button", { name: /continuar/i });
    expect(botaoPrimario).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    expect(botaoPrimario).toBeEnabled();
  });

  it("'Prefiro não' leva à saída e 'Voltar' retorna à identidade sem perder o nome", () => {
    renderEntryFlow();
    entrarNaFesta();

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
    entrarNaFesta();

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não consegui entrar");
  });

  it("link 'Ir para o conteúdo' aponta pro início da coluna", () => {
    renderEntryFlow();
    entrarNaFesta();

    expect(screen.getByRole("link", { name: "Ir para o conteúdo" })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });
});
