import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./select";

describe("Select", () => {
  it("expõe estado de erro acessível", () => {
    render(
      <Select label="Mesa" error="obrigatório" value="" onChange={() => {}}>
        <option value="">Escolha</option>
      </Select>,
    );

    const select = screen.getByLabelText("Mesa");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("obrigatório").className).toMatch(/critico/);
  });

  it("select tem alvo de toque ≥ 48px", () => {
    render(
      <Select label="Mesa" value="" onChange={() => {}}>
        <option value="">Escolha</option>
      </Select>,
    );
    expect(screen.getByLabelText("Mesa").className).toMatch(/min-h-\[48px\]|min-h-12/);
  });

  it("associa o label ao select via htmlFor", () => {
    render(
      <Select label="Mesa" value="" onChange={() => {}}>
        <option value="">Escolha</option>
      </Select>,
    );
    const select = screen.getByLabelText("Mesa");
    const label = screen.getByText("Mesa");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", select.id);
  });
});
