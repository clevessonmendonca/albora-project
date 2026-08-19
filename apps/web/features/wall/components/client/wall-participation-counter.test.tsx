import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WallParticipationCounter } from "./wall-participation-counter";

function stubReducedMotion() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia,
  );
}

describe("WallParticipationCounter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("some quando o dado não chegou — nunca inventa número a partir da janela de rotação", () => {
    const { container } = render(<WallParticipationCounter contadores={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("some quando o evento ainda não tem foto publicada", () => {
    const { container } = render(
      <WallParticipationCounter contadores={{ fotos: 0, convidados: 0 }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra fotos e convidados, com plural, sob prefers-reduced-motion (sem animação pendente)", () => {
    stubReducedMotion();
    render(<WallParticipationCounter contadores={{ fotos: 847, convidados: 63 }} />);

    const overlay = screen.getByRole("status");
    expect(overlay).toHaveAttribute("aria-label", "847 fotos · 63 pessoas");
    expect(overlay.textContent).toContain("847");
    expect(overlay.textContent).toContain("fotos");
    expect(overlay.textContent).toContain("63");
    expect(overlay.textContent).toContain("pessoas");
  });

  it("flexiona singular quando o valor é 1", () => {
    stubReducedMotion();
    render(<WallParticipationCounter contadores={{ fotos: 1, convidados: 1 }} />);

    const overlay = screen.getByRole("status");
    expect(overlay).toHaveAttribute("aria-label", "1 foto · 1 pessoa");
  });

  it("não hardcoda hex nas classes — só tokens semânticos", () => {
    stubReducedMotion();
    const { container } = render(
      <WallParticipationCounter contadores={{ fotos: 847, convidados: 63 }} />,
    );

    for (const el of container.querySelectorAll("[class]")) {
      expect(el.getAttribute("class") ?? "").not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
