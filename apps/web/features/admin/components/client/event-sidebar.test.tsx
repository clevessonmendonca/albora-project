import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventSidebar } from "./event-sidebar";

const mockPathname = vi.fn(() => "/admin/e/abc");
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

const mockCount = vi.fn(() => ({ count: 0 }));
vi.mock("./moderation-count-context", () => ({ useModerationCount: () => mockCount() }));

describe("EventSidebar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/admin/e/abc");
    mockCount.mockReturnValue({ count: 0 });
  });

  it("lista os seis destinos", () => {
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    for (const rotulo of ["Início", "Fotos", "Convidados", "Experiência", "Compartilhar", "Ajustes"]) {
      expect(screen.getByRole("link", { name: new RegExp(rotulo) })).toBeInTheDocument();
    }
  });

  it("marca o destino da rota atual com aria-current", () => {
    mockPathname.mockReturnValue("/admin/e/abc/moderation");
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    expect(screen.getByRole("link", { name: /Fotos/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Início/ })).not.toHaveAttribute("aria-current");
  });

  it("o item ativo não se distingue só por cor", () => {
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);
    const ativo = screen.getByRole("link", { name: /Início/ });

    expect(ativo.className).toMatch(/bg-superficie-alta\b/);
    expect(ativo.className).toMatch(/font-titulo\b/);
  });

  it("mostra a pendência de revisão no destino Fotos", () => {
    mockCount.mockReturnValue({ count: 3 });
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    expect(screen.getByRole("link", { name: /Fotos/ })).toHaveTextContent("3");
  });

  it("acima de nove a pendência vira 9+, para não alargar o item", () => {
    mockCount.mockReturnValue({ count: 42 });
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    expect(screen.getByRole("link", { name: /Fotos/ })).toHaveTextContent("9+");
  });

  it("nome longo de evento não quebra o layout: trunca e guarda o inteiro no title", () => {
    const nome = "Casamento da Maria Fernanda com o João Pedro na Fazenda Santa Clara";
    render(<EventSidebar eventId="abc" nomeDoEvento={nome} />);

    const rotulo = screen.getByTitle(nome);
    expect(rotulo.className).toMatch(/truncate\b/);
  });

  it("tem rótulo de navegação próprio, já que há duas navegações na página", () => {
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    expect(screen.getByRole("navigation", { name: "Seções do evento" })).toBeInTheDocument();
  });
});
