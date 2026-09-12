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
    // Simplificada: uma superfície, sem tablist.
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByText("Festa Teste")).toBeInTheDocument();
    expect(screen.getByText("Entrar na festa")).toBeInTheDocument();
  });

  it("capa vazia oferece escolher", () => {
    const onPickCover = vi.fn();
    render(<LivePreview data={base({ onPickCover })} />);

    fireEvent.click(screen.getByRole("button", { name: "Escolher a capa" }));
    expect(onPickCover).toHaveBeenCalledOnce();
  });
});
