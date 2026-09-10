import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecadoStory } from "./recado-story";

describe("RecadoStory", () => {
  it("mostra rótulo e texto; sem áudio não renderiza player", () => {
    render(
      <RecadoStory rotulo="Um recado dos anfitriões" texto="Obrigado por vir." audio={null} onClose={() => {}} />,
    );
    expect(screen.getByText("Um recado dos anfitriões")).toBeInTheDocument();
    expect(screen.getByText("Obrigado por vir.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ouvir recado/i })).not.toBeInTheDocument();
  });

  it("com áudio, oferece o player de voz", () => {
    render(
      <RecadoStory
        rotulo="Recado"
        texto="Ouça."
        audio={{ url: "blob:x", duracaoSegundos: 18 }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /ouvir recado/i })).toBeInTheDocument();
  });

  it("fecha no X e no Esc", () => {
    const onClose = vi.fn();
    render(<RecadoStory rotulo="Recado" texto="Tchau." audio={null} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("é um dialog modal rotulado pelo recado", () => {
    render(<RecadoStory rotulo="Um recado" texto="Oi." audio={null} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Um recado");
  });
});
