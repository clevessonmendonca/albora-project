import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LivePreview, type LivePreviewData } from "./live-preview";

function base(overrides: Partial<LivePreviewData> = {}): LivePreviewData {
  return {
    vars: {},
    title: "Festa Teste",
    dateLabel: "01 · 09 · 2026",
    ctaLabel: "Entrar na festa",
    momentos: ["A recepção", "Os parabéns", "A festa"],
    coverImage: null,
    layout: "editorial",
    ...overrides,
  };
}

describe("LivePreview", () => {
  it("mostra a capa do convidado numa tela só, sem abas", () => {
    render(<LivePreview data={base()} />);
    // Simplificada (design v5): uma superfície, sem tablist.
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByText("Assim seus convidados veem")).toBeInTheDocument();
    expect(screen.getByText("Entrar na festa")).toBeInTheDocument();
  });

  it("capa vazia oferece escolher; título editável emite no blur", () => {
    const onEditTitle = vi.fn();
    const onPickCover = vi.fn();
    render(<LivePreview data={base({ onEditTitle, onPickCover })} />);

    fireEvent.click(screen.getByRole("button", { name: "Escolher a capa" }));
    expect(onPickCover).toHaveBeenCalledOnce();

    const titulo = screen.getByRole("textbox", { name: "Nome do evento (prévia)" });
    titulo.textContent = "Ana & João";
    fireEvent.blur(titulo);
    expect(onEditTitle).toHaveBeenCalledWith("Ana & João");
  });
});
