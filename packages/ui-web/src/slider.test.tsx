import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slider } from "./slider";

describe("Slider", () => {
  it("renderiza o range e o rótulo", () => {
    render(<Slider label="Luz" min={-50} max={50} value={0} onChange={() => {}} />);
    expect(screen.getByRole("slider", { name: "Luz" })).toBeInTheDocument();
  });

  it("mostra o valor normalizado", () => {
    render(<Slider label="Vinheta" min={0} max={100} value={0.5} onChange={() => {}} />);
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  /**
   * jsdom não computa estilo de pseudo-elemento (`::-webkit-slider-runnable-track`),
   * então não dá pra ler `getComputedStyle` do trilho aqui — a prova real de que o
   * CSS compilado pinta o degradê está no report da task (compilação real via
   * `@tailwindcss/postcss`). Este teste trava a classe-fonte: a sintaxe de
   * propriedade arbitrária `[background:var(--track-bg)]` gera o shorthand
   * `background` (aceita gradiente); a sintaxe de cor `bg-[var(--track-bg)]`
   * geraria `background-color` (regressão já cometida uma vez — um
   * `linear-gradient` em `background-color` é CSS inválido e não pinta nada).
   */
  it("usa a propriedade `background` (shorthand) no trilho, não `background-color`", () => {
    render(<Slider label="Luz" min={-50} max={50} value={0} onChange={() => {}} />);
    const input = screen.getByRole("slider", { name: "Luz" });

    expect(input.className).toMatch(/\[&::-webkit-slider-runnable-track\]:\[background:var\(--track-bg\)\]/);
    expect(input.className).toMatch(/\[&::-moz-range-track\]:\[background:var\(--track-bg\)\]/);
    expect(input.className).not.toMatch(/::-webkit-slider-runnable-track\]:bg-\[var\(--track-bg\)\]/);
    expect(input.className).not.toMatch(/::-moz-range-track\]:bg-\[var\(--track-bg\)\]/);
  });

  it("degradê nasce no neutro pra controle bipolar", () => {
    const { rerender } = render(
      <Slider label="Calor" min={-50} max={50} value={0} onChange={() => {}} bipolar />,
    );
    const input = screen.getByRole("slider", { name: "Calor" }) as HTMLInputElement;
    expect(input.style.getPropertyValue("--track-bg")).toContain("var(--linha) 0 50%");

    rerender(<Slider label="Calor" min={-50} max={50} value={0.4} onChange={() => {}} bipolar />);
    expect(
      (screen.getByRole("slider", { name: "Calor" }) as HTMLInputElement).style.getPropertyValue(
        "--track-bg",
      ),
    ).toContain("50% 70%");
  });

  it("dá foco visível de teclado com o token de acento", () => {
    render(<Slider label="Luz" min={-50} max={50} value={0} onChange={() => {}} />);
    expect(screen.getByRole("slider", { name: "Luz" }).className).toMatch(
      /focus-visible:outline-acento-texto/,
    );
  });
});
