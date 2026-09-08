import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  it("mostra as três superfícies e troca ao clicar na aba", () => {
    render(<LivePreview data={base()} />);
    const tablist = screen.getByRole("tablist", { name: "Superfície da prévia" });
    expect(within(tablist).getAllByRole("tab")).toHaveLength(3);

    // Convidado é o default: CTA do convidado aparece.
    expect(screen.getByText("Entrar na festa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Telão" }));
    expect(screen.getByText("ao vivo")).toBeInTheDocument();
    expect(screen.queryByText("Entrar na festa")).not.toBeInTheDocument();
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
