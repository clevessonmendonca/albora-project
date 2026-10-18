import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonogramaField } from "./monograma-field";

describe("MonogramaField", () => {
  it("oferece as opções derivadas das iniciais e o sem monograma", () => {
    render(<MonogramaField value={null} onChange={() => {}} nome="Ana & João" />);
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual([
      "A&J",
      "AJ",
      "A + J",
      "Sem monograma",
      "Personalizado",
    ]);
  });

  it("escolher devolve o valor; sem monograma devolve vazio", () => {
    const onChange = vi.fn();
    render(<MonogramaField value="AJ" onChange={onChange} nome="Ana & João" />);
    expect(screen.getByRole("radio", { name: "AJ" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "A&J" }));
    expect(onChange).toHaveBeenLastCalledWith("A&J");
    fireEvent.click(screen.getByRole("radio", { name: "Sem monograma" }));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("valor fora das opções vira personalizado, limitado a 8", () => {
    const onChange = vi.fn();
    render(<MonogramaField value="XYZ" onChange={onChange} nome="Ana & João" />);
    expect(screen.getByRole("radio", { name: "Personalizado" })).toHaveAttribute("aria-checked", "true");
    const campo = screen.getByLabelText("Monograma personalizado");
    expect(campo).toHaveAttribute("maxlength", "8");
    fireEvent.change(campo, { target: { value: "Casa 12" } });
    expect(onChange).toHaveBeenLastCalledWith("Casa 12");
  });
});
