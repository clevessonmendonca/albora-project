import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FloatingNav } from "./floating-nav";

describe("FloatingNav", () => {
  const base = "/e/ana-e-joao";

  it("renderiza os 5 links com os hrefs corretos e marca o item ativo", () => {
    render(<FloatingNav active="inicio" base={base} />);

    expect(screen.getByRole("link", { name: /início/i })).toHaveAttribute("href", base);
    expect(screen.getByRole("link", { name: /missões/i })).toHaveAttribute(
      "href",
      `${base}/missions`,
    );
    expect(screen.getByRole("link", { name: "Mandar foto ou vídeo" })).toHaveAttribute(
      "href",
      `${base}/photo`,
    );
    expect(screen.getByRole("link", { name: /álbum/i })).toHaveAttribute("href", `${base}/album`);
    expect(screen.getByRole("link", { name: /minhas/i })).toHaveAttribute(
      "href",
      `${base}/my-photos`,
    );

    const inicioLink = screen.getByRole("link", { name: /início/i });
    expect(inicioLink).toHaveAttribute("aria-current", "page");
    expect(inicioLink.className).toContain("text-acento");

    const missoesLink = screen.getByRole("link", { name: /missões/i });
    expect(missoesLink).not.toHaveAttribute("aria-current");
    expect(missoesLink.className).toContain("text-ink-3");
  });

  it("expõe aria-label acessível no botão de câmera", () => {
    render(<FloatingNav active="album" base={base} />);

    expect(screen.getByRole("link", { name: "Mandar foto ou vídeo" })).toBeInTheDocument();
  });

  it("sem `active` (tela sem slot correspondente, ex. /feed), nenhum item fica marcado", () => {
    render(<FloatingNav base={base} />);

    for (const name of [/início/i, /missões/i, /álbum/i, /minhas/i]) {
      const link = screen.getByRole("link", { name });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link.className).toContain("text-ink-3");
    }
  });
});
