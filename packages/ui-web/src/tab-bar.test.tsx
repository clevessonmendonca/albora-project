import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabBar } from "./tab-bar";

describe("TabBar", () => {
  it("renderiza os 4 rótulos e marca o item ativo", () => {
    render(<TabBar active="feed" />);

    expect(screen.getByText("Feed")).toBeInTheDocument();
    expect(screen.getByText("Missões")).toBeInTheDocument();
    expect(screen.getByText("Álbum")).toBeInTheDocument();
    expect(screen.getByText("Minhas")).toBeInTheDocument();

    expect(screen.getByText("Feed").className).toContain("text-acento");
    expect(screen.getByText("Missões").className).toContain("text-ink-3");
    expect(screen.getByText("Álbum").className).toContain("text-ink-3");
    expect(screen.getByText("Minhas").className).toContain("text-ink-3");
  });

  it("troca o item marcado conforme `active`", () => {
    render(<TabBar active="album" />);

    expect(screen.getByText("Álbum").className).toContain("text-acento");
    expect(screen.getByText("Feed").className).toContain("text-ink-3");
  });

  it("renderiza o botão de câmera, sem link (nav é decorativo, sem navegação real)", () => {
    const { container } = render(<TabBar active="feed" />);

    const camera = container.querySelector(".shadow-acento");
    expect(camera).toBeInTheDocument();
    expect(camera?.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("marca a aba ativa com aria-current e cor de texto-acento; inativas sem aria-current", () => {
    render(<TabBar active="feed" />);

    const ativo = screen.getByText("Feed");
    expect(ativo).toHaveAttribute("aria-current", "page");
    expect(ativo.className).toContain("text-acento-texto");

    for (const label of ["Missões", "Álbum", "Minhas"]) {
      const inativo = screen.getByText(label);
      expect(inativo).not.toHaveAttribute("aria-current");
    }
  });
});
