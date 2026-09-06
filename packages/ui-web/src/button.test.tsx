import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renderiza os children recebidos", () => {
    render(<Button>Confirmar presença</Button>);

    expect(screen.getByRole("button", { name: "Confirmar presença" })).toBeInTheDocument();
  });

  it("alvo de toque mínimo por tamanho: sm=44px, md=48px, lg=56px", () => {
    const { rerender } = render(<Button size="sm">Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" }).className).toMatch(/min-h-11\b/);

    rerender(<Button size="md">Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" }).className).toMatch(/min-h-12\b/);

    rerender(<Button size="lg">Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" }).className).toMatch(/min-h-14\b/);
  });

  it("primário usa preenchimento de acento com texto legível sobre acento", () => {
    render(<Button variant="primary">Ok</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/bg-acento\b/);
    expect(btn.className).toMatch(/text-sobre-acento\b/);
  });

  it("secundário é contorno, terciário é texto puro", () => {
    const { rerender } = render(<Button variant="secondary">a</Button>);
    let btn = screen.getByRole("button");
    expect(btn.className).toMatch(/\bborder\b/);
    expect(btn.className).toMatch(/border-linha\b/);
    expect(btn.className).toMatch(/text-ink\b/);

    rerender(<Button variant="tertiary">a</Button>);
    btn = screen.getByRole("button");
    expect(btn.className).toMatch(/text-acento-texto\b/);
    expect(btn.className).toMatch(/bg-transparent\b/);
  });

  it("dá feedback de press com a curva de mola e duração instantânea", () => {
    render(<Button>Ok</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/active:scale-\[0\.97\]/);
    expect(btn.className).toMatch(/ease-mola\b/);
    expect(btn.className).toMatch(/duration-instantaneo\b/);
  });

  it("preserva a variante legada 'ghost', mapeada para o tratamento terciário", () => {
    const { rerender } = render(<Button variant="tertiary">a</Button>);
    const tertiaryClass = screen.getByRole("button").className;

    rerender(<Button variant="ghost">a</Button>);
    expect(screen.getByRole("button").className).toBe(tertiaryClass);
  });

  it("não remove o outline global de :focus-visible", () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole("button").className).not.toMatch(/outline-none/);
  });
});
