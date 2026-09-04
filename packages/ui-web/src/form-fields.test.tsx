import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConsentCheckbox, NameField } from "./form-fields";

describe("NameField", () => {
  it("tem nome acessível derivado do placeholder quando nenhum é informado", () => {
    render(<NameField value="" onChange={() => {}} placeholder="Tio João" />);
    expect(screen.getByLabelText("Tio João")).toBeInTheDocument();
  });

  it("aceita ariaLabel explícito sem quebrar a API existente", () => {
    render(<NameField value="" onChange={() => {}} placeholder="Tio João" ariaLabel="Seu nome" />);
    expect(screen.getByLabelText("Seu nome")).toBeInTheDocument();
  });

  it("input tem alvo de toque ≥ 48px", () => {
    render(<NameField value="" onChange={() => {}} placeholder="Tio João" />);
    expect(screen.getByLabelText("Tio João").className).toMatch(/min-h-\[48px\]|min-h-12/);
  });

  it("chama onChange com o novo valor", () => {
    const onChange = vi.fn();
    render(<NameField value="" onChange={onChange} placeholder="Tio João" />);
    const input = screen.getByLabelText("Tio João");
    fireEvent.change(input, { target: { value: "Ana" } });
    expect(onChange).toHaveBeenCalledWith("Ana");
  });
});

describe("ConsentCheckbox", () => {
  it("expõe role checkbox com nome acessível vindo do conteúdo", () => {
    render(<ConsentCheckbox checked={false}>Concordo com os termos</ConsentCheckbox>);
    expect(screen.getByRole("checkbox", { name: "Concordo com os termos" })).toBeInTheDocument();
  });

  it("reflete o estado checked", () => {
    render(<ConsentCheckbox checked={true}>Concordo</ConsentCheckbox>);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("caixa visual ≥ 24px (size-6)", () => {
    render(<ConsentCheckbox checked={false}>Concordo</ConsentCheckbox>);
    const box = document.querySelector('[data-testid="consent-checkbox-visual"]');
    expect(box?.className).toMatch(/size-6\b|size-\[1\.5rem\]/);
  });

  it("área clicável ≥ 44px (alvo de toque)", () => {
    render(<ConsentCheckbox checked={false}>Concordo</ConsentCheckbox>);
    const hitArea = document.querySelector('[data-testid="consent-checkbox-hit-area"]');
    expect(hitArea?.className).toMatch(/min-h-11\b|min-h-\[44px\]|size-11\b|min-w-\[44px\]/);
  });

  it("chama onChange ao alternar", () => {
    const onChange = vi.fn();
    render(
      <ConsentCheckbox checked={false} onChange={onChange}>
        Concordo
      </ConsentCheckbox>,
    );
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    checkbox.click();
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
