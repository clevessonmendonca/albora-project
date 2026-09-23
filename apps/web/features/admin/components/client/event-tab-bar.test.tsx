import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventTabBar } from "./event-tab-bar";

const mockPathname = vi.fn(() => "/admin/e/abc");
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

const mockCount = vi.fn(() => ({ count: 0 }));
vi.mock("./moderation-count-context", () => ({ useModerationCount: () => mockCount() }));

describe("EventTabBar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/admin/e/abc");
    mockCount.mockReturnValue({ count: 0 });
  });

  it("mostra quatro destinos diretos e o botão Mais", () => {
    render(<EventTabBar eventId="abc" />);

    for (const rotulo of ["Início", "Fotos", "Convidados", "Experiência"]) {
      expect(screen.getByRole("link", { name: new RegExp(rotulo) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /Mais/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Compartilhar/ })).not.toBeInTheDocument();
  });

  it("Mais abre o resto dos destinos sem tirar o anfitrião da tela", async () => {
    const user = userEvent.setup();
    render(<EventTabBar eventId="abc" />);

    await user.click(screen.getByRole("button", { name: /Mais/ }));

    expect(screen.getByRole("link", { name: /Compartilhar/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ajustes/ })).toBeInTheDocument();
  });

  it("estando numa rota de Ajustes, o Mais aparece marcado", () => {
    mockPathname.mockReturnValue("/admin/e/abc/consent");
    render(<EventTabBar eventId="abc" />);

    expect(screen.getByRole("button", { name: /Mais/ })).toHaveAttribute("aria-current", "page");
  });

  it("marca o destino da rota atual", () => {
    mockPathname.mockReturnValue("/admin/e/abc/album");
    render(<EventTabBar eventId="abc" />);

    expect(screen.getByRole("link", { name: /Fotos/ })).toHaveAttribute("aria-current", "page");
  });

  it("respeita a área segura do aparelho", () => {
    render(<EventTabBar eventId="abc" />);

    expect(screen.getByRole("navigation", { name: "Navegação do evento" }).className).toMatch(
      /pb-\[env\(safe-area-inset-bottom\)\]/,
    );
  });

  it("todo alvo de toque tem pelo menos 44px", () => {
    render(<EventTabBar eventId="abc" />);

    for (const alvo of screen.getAllByRole("link")) {
      expect(alvo.className).toMatch(/min-h-11\b/);
    }
    expect(screen.getByRole("button", { name: /Mais/ }).className).toMatch(/min-h-11\b/);
  });
});
