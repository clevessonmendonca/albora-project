import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WEDDING } from "@albora/packs";
import { CoverScreen } from "./cover-screen";

const MOMENTS = ["Chegada", "Cerimônia", "Recepção", "Pista", "Depois"];

describe("CoverScreen", () => {
  it("renderiza o nome do evento em serifada via EventHero", () => {
    render(<CoverScreen pack={WEDDING} moments={MOMENTS} background="dark" />);

    const heading = screen.getByRole("heading", { name: "ANA & JOÃO" });
    expect(heading.className).toContain("font-titulo");
    expect(heading.className).not.toContain("font-corpo");
  });

  it("mostra os 4 atalhos com número ao vivo quando os dados existem", () => {
    const { container } = render(
      <CoverScreen
        pack={WEDDING}
        moments={MOMENTS}
        background="dark"
        counts={{ fotos: 847, convidados: 112, interactionOpen: true }}
      />,
    );
    const atalhos = within(container.querySelector(".grid-cols-4") as HTMLElement);

    expect(atalhos.getByText("Álbum")).toBeInTheDocument();
    expect(atalhos.getByText("847")).toBeInTheDocument();
    expect(atalhos.getByText("Missões")).toBeInTheDocument();
    expect(atalhos.getByText(`${WEDDING.missoes.length} restantes`)).toBeInTheDocument();
    expect(atalhos.getByText("Feed")).toBeInTheDocument();
    expect(atalhos.getByText("ao vivo")).toBeInTheDocument();
    expect(atalhos.getByText("Convidados")).toBeInTheDocument();
    expect(atalhos.getByText("112")).toBeInTheDocument();
  });

  it("não inventa número: sem `counts`, os cards sem dado mostram travessão", () => {
    const { container } = render(<CoverScreen pack={WEDDING} moments={MOMENTS} background="dark" />);
    const atalhos = within(container.querySelector(".grid-cols-4") as HTMLElement);

    // Álbum, Feed e Convidados não têm dado disponível — só Missões tem (pack.missoes.length é real).
    expect(atalhos.getAllByText("—")).toHaveLength(3);
  });

  it("Feed mostra em breve quando a interação ainda não abriu", () => {
    render(
      <CoverScreen
        pack={WEDDING}
        moments={MOMENTS}
        background="dark"
        counts={{ interactionOpen: false }}
      />,
    );

    expect(screen.getByText("em breve")).toBeInTheDocument();
  });

  it("renderiza até 5 álbuns da festa com título serifado sobreposto", () => {
    render(<CoverScreen pack={WEDDING} moments={MOMENTS} background="dark" />);

    expect(screen.getByText("Álbuns da festa")).toBeInTheDocument();
    for (const titulo of MOMENTS) {
      expect(screen.getByText(titulo)).toBeInTheDocument();
    }
  });

  it("integra o FloatingNav com base derivada do slug e Início ativo", () => {
    render(<CoverScreen pack={WEDDING} moments={MOMENTS} background="dark" slug="ana-e-joao" />);

    const inicio = screen.getByRole("link", { name: /início/i });
    expect(inicio).toHaveAttribute("href", "/e/ana-e-joao");
    expect(inicio).toHaveAttribute("aria-current", "page");
  });

  it("não hardcoda hex nas classes — só tokens semânticos", () => {
    // `style` inline vem de `resolveTokens` em runtime, não é hex hardcodado — o componente só controla classes, e é ali que o guard tools/guards/tokens.mjs reprova hex literal.
    const { container } = render(<CoverScreen pack={WEDDING} moments={MOMENTS} background="dark" />);

    for (const el of container.querySelectorAll("[class]")) {
      expect(el.getAttribute("class") ?? "").not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
