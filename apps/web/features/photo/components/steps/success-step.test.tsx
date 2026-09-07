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
});
