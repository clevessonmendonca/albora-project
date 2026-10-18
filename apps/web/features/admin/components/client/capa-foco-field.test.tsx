import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CapaFocoField } from "./capa-foco-field";

describe("CapaFocoField", () => {
  it("marca o foco atual e avisa a troca em cada eixo", () => {
    const onChange = vi.fn();
    const onChangeX = vi.fn();
    render(<CapaFocoField value={50} onChange={onChange} valueX={50} onChangeX={onChangeX} />);
    const vertical = within(screen.getByRole("radiogroup", { name: "Vertical" }));
    const horizontal = within(screen.getByRole("radiogroup", { name: "Horizontal" }));
    expect(vertical.getByRole("radio", { name: "Centro" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(vertical.getByRole("radio", { name: "Mais alto" }));
    expect(onChange).toHaveBeenCalledWith(25);
    fireEvent.click(horizontal.getByRole("radio", { name: "Direita" }));
    expect(onChangeX).toHaveBeenCalledWith(75);
  });
});
