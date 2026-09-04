import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "./text-field";

describe("TextField", () => {
  it("expõe estado de erro acessível", () => {
    render(<TextField label="Email" error="inválido" value="" onChange={() => {}} />);

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("inválido").className).toMatch(/critico/);
  });

  it("sem erro, não marca aria-invalid", () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);

    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("input tem alvo de toque ≥ 48px", () => {
    render(<TextField label="Nome" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Nome").className).toMatch(/min-h-\[48px\]|min-h-12/);
  });

  it("associa o label ao input via htmlFor", () => {
    render(<TextField label="Nome" value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Nome");
    const label = screen.getByText("Nome");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", input.id);
  });

  it("placeholder usa o token ink-3", () => {
    render(<TextField label="Nome" value="" onChange={() => {}} placeholder="Tio João" />);
    expect(screen.getByLabelText("Nome").className).toMatch(/placeholder:text-ink-3/);
  });

  it("foco visível mantém contorno de acento (não remove outline sem substituir)", () => {
    render(<TextField label="Nome" value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Nome");
    if (input.className.includes("outline-none")) {
      expect(input.className).toMatch(/focus-visible:ring|focus:ring/);
    }
  });

  it("aceita onChange sem quebrar (API preservada)", () => {
    const onChange = vi.fn();
    render(<TextField label="Nome" value="" onChange={onChange} />);
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  });
});
