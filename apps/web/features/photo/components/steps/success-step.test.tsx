import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuccessStep } from "./success-step";

describe("SuccessStep", () => {
  const propsBase = { uploadId: "upload-123", onRestart: vi.fn(), onViewFeed: vi.fn() };

  it("sem eventId, NÃO mostra o botão de reivindicar — nunca antes da sessão ativa (ADR 0018)", () => {
    render(<SuccessStep {...propsBase} />);
    expect(screen.queryByRole("button", { name: "Receber minhas fotos" })).not.toBeInTheDocument();
  });

  it("com eventId, mostra o botão de reivindicar", () => {
    render(<SuccessStep {...propsBase} eventId="evento-123" />);
    expect(screen.getByRole("button", { name: "Receber minhas fotos" })).toBeInTheDocument();
  });

  it("recompensa v4: entrou na festa + checklist álbum/telão, sem ID de debug", () => {
    render(<SuccessStep {...propsBase} />);
    expect(screen.getByText("Sua foto entrou na festa")).toBeInTheDocument();
    expect(screen.getByText("No álbum")).toBeInTheDocument();
    expect(screen.getByText("Pode aparecer no telão")).toBeInTheDocument();
    // O ID cru de upload não é conteúdo pro convidado.
    expect(screen.queryByText(/^ID:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tirar outra" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver no feed" })).toBeInTheDocument();
  });
});
