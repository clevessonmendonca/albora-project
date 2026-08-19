import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecapSheet } from "./recap-sheet";

const QUADROS = [
  { id: "foto-1", url: "blob:um" },
  { id: "foto-2", url: "blob:dois" },
  { id: "foto-3", url: "blob:tres" },
];

describe("RecapSheet", () => {
  it("fechado, não renderiza nada", () => {
    render(
      <RecapSheet
        aberto={false}
        quadros={QUADROS}
        indiceAtivo={0}
        erro={null}
        compartilhando={false}
        onIr={vi.fn()}
        onFechar={vi.fn()}
        onCompartilhar={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aberto, mostra o quadro ativo, a contagem e o botão de compartilhar", () => {
    render(
      <RecapSheet
        aberto
        quadros={QUADROS}
        indiceAtivo={0}
        erro={null}
        compartilhando={false}
        onIr={vi.fn()}
        onFechar={vi.fn()}
        onCompartilhar={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Recap da sua noite" })).toBeInTheDocument();
    expect(screen.getByText("Recap · 1/3")).toBeInTheDocument();
    expect(screen.getByAltText("Recap, foto 1 de 3")).toHaveAttribute("src", "blob:um");
    expect(screen.getByRole("button", { name: /Compartilhar recap/ })).toBeInTheDocument();
  });

  it("tocar em 'próxima' chama onIr com o índice seguinte", () => {
    const onIr = vi.fn();
    render(
      <RecapSheet
        aberto
        quadros={QUADROS}
        indiceAtivo={0}
        erro={null}
        compartilhando={false}
        onIr={onIr}
        onFechar={vi.fn()}
        onCompartilhar={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Próxima foto do recap" }));
    expect(onIr).toHaveBeenCalledWith(1);
  });

  it("na última foto, 'próxima' fica desabilitado", () => {
    render(
      <RecapSheet
        aberto
        quadros={QUADROS}
        indiceAtivo={2}
        erro={null}
        compartilhando={false}
        onIr={vi.fn()}
        onFechar={vi.fn()}
        onCompartilhar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Próxima foto do recap" })).toBeDisabled();
  });

  it("Escape fecha o recap", () => {
    const onFechar = vi.fn();
    render(
      <RecapSheet
        aberto
        quadros={QUADROS}
        indiceAtivo={0}
        erro={null}
        compartilhando={false}
        onIr={vi.fn()}
        onFechar={onFechar}
        onCompartilhar={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onFechar).toHaveBeenCalledOnce();
  });

  it("compartilhando, desabilita o botão e troca a legenda", () => {
    render(
      <RecapSheet
        aberto
        quadros={QUADROS}
        indiceAtivo={0}
        erro={null}
        compartilhando
        onIr={vi.fn()}
        onFechar={vi.fn()}
        onCompartilhar={vi.fn()}
      />,
    );

    const botao = screen.getByRole("button", { name: /Preparando/ });
    expect(botao).toBeDisabled();
  });

  it("com erro, mostra a mensagem", () => {
    render(
      <RecapSheet
        aberto
        quadros={QUADROS}
        indiceAtivo={0}
        erro="Não deu para compartilhar o recap agora."
        compartilhando={false}
        onIr={vi.fn()}
        onFechar={vi.fn()}
        onCompartilhar={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não deu para compartilhar o recap agora.");
  });
});
