import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CapaFocoField } from "./capa-foco-field";

describe("CapaFocoField", () => {
  it("marca o foco atual e avisa a troca", () => {
    const onChange = vi.fn();
    render(<CapaFocoField value={50} onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Centro" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Mais alto" }));
    expect(onChange).toHaveBeenCalledWith(25);
  });
});
