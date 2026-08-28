import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventHero } from "./event-hero";

describe("EventHero", () => {
  it("renderiza titulo e data", () => {
    render(<EventHero titulo="Título do Evento" data="8 de novembro" />);

    expect(screen.getByRole("heading", { name: "Título do Evento" })).toBeInTheDocument();
    expect(screen.getByText("8 de novembro")).toBeInTheDocument();
  });

  it("chama onBack ao clicar no botão de voltar", async () => {
    const onBack = vi.fn();
    render(<EventHero titulo="Título do Evento" onBack={onBack} />);

    screen.getByRole("button", { name: "Voltar" }).click();

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("usa a fonte de título serifada, não a de corpo", () => {
    render(<EventHero titulo="Título do Evento" />);

    const heading = screen.getByRole("heading", { name: "Título do Evento" });

    expect(heading.className).toContain("font-titulo");
    expect(heading.className).not.toContain("font-corpo");
  });

  it("não hardcoda cor via hex — só tokens", () => {
    const { container } = render(
      <EventHero titulo="Título do Evento" overline="Rótulo" data="8 de novembro" />,
    );

    const withInlineStyle = container.querySelectorAll("[style]");
    withInlineStyle.forEach((el) => {
      expect(el.getAttribute("style") ?? "").not.toContain("#");
    });

    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
