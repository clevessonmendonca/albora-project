import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BarraInferiorDoPainel } from "./barra-inferior-do-painel";

const mockPathname = vi.fn(() => "/admin/e/abc");
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

const mockCount = vi.fn(() => ({ count: 0 }));
vi.mock("./moderation-count-context", () => ({ useModerationCount: () => mockCount() }));

describe("BarraInferiorDoPainel", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/admin/e/abc");
    mockCount.mockReturnValue({ count: 0 });
  });

  it("leva quatro destinos diretos e o botão Mais", () => {
    render(<BarraInferiorDoPainel eventoId="abc" gavetaAberta={false} aoAbrirMenu={() => {}} />);

    expect(screen.getAllByRole("link")).toHaveLength(4);
    for (const rotulo of ["Visão geral", "Álbum", "Comunidade", "Inspiração"]) {
      expect(screen.getByRole("link", { name: new RegExp(rotulo) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /Mais/ })).toBeInTheDocument();
  });

  it("Mais abre a gaveta em vez de navegar", async () => {
    const abrir = vi.fn();
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<BarraInferiorDoPainel eventoId="abc" gavetaAberta={false} aoAbrirMenu={abrir} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /Mais/ }));

    expect(abrir).toHaveBeenCalledOnce();
  });

  it("marca o destino da rota atual", () => {
    mockPathname.mockReturnValue("/admin/e/abc/album");
    render(<BarraInferiorDoPainel eventoId="abc" gavetaAberta={false} aoAbrirMenu={() => {}} />);

    expect(screen.getByRole("link", { name: /Álbum/ })).toHaveAttribute("aria-current", "page");
  });

  it("um destino que só existe na gaveta não marca nada na barra", () => {
    mockPathname.mockReturnValue("/admin/e/abc/ajustes");
    render(<BarraInferiorDoPainel eventoId="abc" gavetaAberta={false} aoAbrirMenu={() => {}} />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("mostra a pendência de revisão no Álbum", () => {
    mockCount.mockReturnValue({ count: 5 });
    render(<BarraInferiorDoPainel eventoId="abc" gavetaAberta={false} aoAbrirMenu={() => {}} />);

    expect(screen.getByRole("link", { name: /Álbum/ })).toHaveTextContent("5");
  });
});
