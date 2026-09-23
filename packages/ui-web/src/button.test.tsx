import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonClasses } from "./button";

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

  it("destrutivo se anuncia como destrutivo, não como acento", () => {
    render(<Button variant="danger">Encerrar evento</Button>);
    const btn = screen.getByRole("button", { name: "Encerrar evento" });

    expect(btn.className).toMatch(/bg-critico\b/);
    expect(btn.className).toMatch(/text-sobre-acento\b/);
    expect(btn.className).not.toMatch(/bg-acento\b/);
  });

  it("não remove o outline global de :focus-visible", () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole("button").className).not.toMatch(/outline-none/);
  });
});

describe("buttonClasses", () => {
  it("dá ao link exatamente as classes que o botão renderiza", () => {
    render(
      <Button variant="primary" size="sm">
        x
      </Button>,
    );

    expect(screen.getByRole("button").className).toBe(
      buttonClasses({ variant: "primary", size: "sm" }),
    );
  });

  it("vale para toda variante e todo tamanho", () => {
    const variantes = ["primary", "secondary", "tertiary", "danger"] as const;
    const tamanhos = ["sm", "md", "lg"] as const;

    for (const variant of variantes) {
      for (const size of tamanhos) {
        const { unmount } = render(
          <Button variant={variant} size={size}>
            x
          </Button>,
        );
        expect(screen.getByRole("button").className).toBe(buttonClasses({ variant, size }));
        unmount();
      }
    }
  });
});
