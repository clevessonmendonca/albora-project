import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarDoPainel } from "./sidebar-do-painel";

const mockPathname = vi.fn(() => "/admin/e/abc");
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

const mockCount = vi.fn(() => ({ count: 0 }));
vi.mock("./moderation-count-context", () => ({ useModerationCount: () => mockCount() }));

const evento = { id: "abc", nome: "Festa", data: "12 de dezembro de 2027", monograma: "F" };
const perfil = { nome: "anfitriao@exemplo.com", plano: "Plano Essencial" };

function montar(props: Partial<React.ComponentProps<typeof SidebarDoPainel>> = {}) {
  return render(
    <SidebarDoPainel
      evento={evento}
      perfil={perfil}
      aberta={false}
      aoNavegar={() => {}}
      aoTrocarEvento={() => {}}
      {...props}
    />,
  );
}

describe("SidebarDoPainel", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/admin/e/abc");
    mockCount.mockReturnValue({ count: 0 });
  });

  it("lista os onze destinos", () => {
    montar();

    for (const rotulo of [
      "Visão geral",
      "Convidados",
      "Álbum",
      "Telão ao vivo",
      "Missões",
      "Insights",
      "Comunidade",
      "Inspiração",
      "Identidade",
      "QR e convite",
      "Configurações",
    ]) {
      expect(screen.getByRole("link", { name: new RegExp(rotulo) })).toBeInTheDocument();
    }
  });

  it("agrupa os destinos em três blocos rotulados", () => {
    montar();

    for (const grupo of ["Seu evento", "Descobrir", "Personalização"]) {
      expect(screen.getByRole("navigation", { name: grupo })).toBeInTheDocument();
    }
  });

  it("marca o destino da rota atual com aria-current", () => {
    mockPathname.mockReturnValue("/admin/e/abc/moderation");
    montar();

    expect(screen.getByRole("link", { name: /Álbum/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Visão geral/ })).not.toHaveAttribute("aria-current");
  });

  it("o item ativo não se distingue só por cor: ganha fundo e a barra de acento", () => {
    montar();
    const ativo = screen.getByRole("link", { name: /Visão geral/ });

    expect(ativo.className).toMatch(/bg-superficie-alta\b/);
    expect(ativo.className).toMatch(/before:bg-acento\b/);
  });

  it("mostra a pendência de revisão no destino Álbum", () => {
    mockCount.mockReturnValue({ count: 3 });
    montar();

    expect(screen.getByRole("link", { name: /Álbum/ })).toHaveTextContent("3");
  });

  it("acima de nove a pendência vira 9+, para não alargar o item", () => {
    mockCount.mockReturnValue({ count: 42 });
    montar();

    expect(screen.getByRole("link", { name: /Álbum/ })).toHaveTextContent("9+");
  });

  it("nome longo de evento trunca em vez de esticar a sidebar", () => {
    const nome = "Celebração da Maria Fernanda com o João Pedro na Fazenda Santa Clara";
    montar({ evento: { ...evento, nome } });

    expect(screen.getByText(nome).className).toMatch(/truncate\b/);
  });

  it("a gaveta fechada fica fora da tela e a aberta entra", () => {
    const { container, rerender } = montar();
    const fechada = container.querySelector("aside");
    expect(fechada?.className).toMatch(/-translate-x-full\b/);

    rerender(
      <SidebarDoPainel
        evento={evento}
        perfil={perfil}
        aberta
        aoNavegar={() => {}}
        aoTrocarEvento={() => {}}
      />,
    );
    expect(container.querySelector("aside")?.className).toMatch(/translate-x-0\b/);
  });

  it("sem evento, a sidebar mostra só o que é da conta", () => {
    mockPathname.mockReturnValue("/admin/comunidade");
    montar({ evento: null });

    expect(screen.getByRole("navigation", { name: "Descobrir" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Seu evento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Personalização" })).not.toBeInTheDocument();
    expect(screen.queryByText(evento.nome)).not.toBeInTheDocument();
  });

  it("Comunidade aponta para a conta, não para o evento — o feed é o mesmo em qualquer um", () => {
    montar();

    expect(screen.getByRole("link", { name: /Comunidade/ })).toHaveAttribute(
      "href",
      "/admin/comunidade",
    );
    expect(screen.getByRole("link", { name: /Álbum/ })).toHaveAttribute(
      "href",
      "/admin/e/abc/album",
    );
  });
});
