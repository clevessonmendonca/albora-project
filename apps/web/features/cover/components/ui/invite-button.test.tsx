import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteButton } from "./invite-button";

/**
 * Cobre o comportamento preservado na migração do `<button>` bespoke pro
 * `Button` compartilhado (`@albora/ui-web`) — a ação secundária "Convidar
 * amigos" continua chamando Web Share (com fallback pra clipboard) e não
 * regride no alvo de toque nem na hierarquia visual (contorno, não preenchido).
 */

function renderInviteButton() {
  return render(<InviteButton slug="ana-e-joao" eventName="Ana & João" />);
}

describe("InviteButton", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("usa Web Share quando disponível", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });

    renderInviteButton();
    fireEvent.click(screen.getByRole("button", { name: "Convidar amigos" }));

    await vi.waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: "Ana & João",
        url: expect.stringContaining("/e/ana-e-joao"),
      }),
    );
  });

  it("cai pra clipboard e confirma cópia quando Web Share não existe", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share: undefined, clipboard: { writeText } });

    renderInviteButton();
    fireEvent.click(screen.getByRole("button", { name: "Convidar amigos" }));

    expect(await screen.findByRole("button", { name: "Link copiado!" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/e/ana-e-joao"));
  });

  it("alvo de toque ≥44px e hierarquia secundária (contorno, não preenchido)", () => {
    renderInviteButton();
    const btn = screen.getByRole("button", { name: "Convidar amigos" });
    expect(btn.className).toMatch(/min-h-12\b/);
    expect(btn.className).toMatch(/border-linha\b/);
    expect(btn.className).not.toMatch(/bg-acento\b/);
  });
});
