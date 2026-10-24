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

  it("o convite ao app é ação discreta: a única primária é Tirar outra", () => {
    const onInstallPwa = vi.fn();
    render(<SuccessStep {...propsBase} showPwaInstall onInstallPwa={onInstallPwa} />);
    const instalar = screen.getByRole("button", { name: /Instalar o app/ });
    instalar.click();
    expect(onInstallPwa).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Instalar agora" })).not.toBeInTheDocument();
  });
});
