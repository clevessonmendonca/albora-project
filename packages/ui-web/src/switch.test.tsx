import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("chama onChange com o valor invertido ao clicar", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} label="Modo endurecido" onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "Modo endurecido" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("sem disabled (default), o botão não fica desabilitado", () => {
    render(<Switch checked={false} label="Modo endurecido" onChange={vi.fn()} />);

    const el = screen.getByRole("switch", { name: "Modo endurecido" });
    expect(el).not.toBeDisabled();
    expect(el).toHaveAttribute("aria-disabled", "false");
  });

  it("com disabled=true, não dispara onChange ao clicar", () => {
    const onChange = vi.fn();
    render(
      <Switch checked={false} label="Modo endurecido" onChange={onChange} disabled={true} />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Modo endurecido" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("com disabled=true, aplica o estado desabilitado no elemento", () => {
    render(<Switch checked={false} label="Modo endurecido" onChange={vi.fn()} disabled={true} />);

    const el = screen.getByRole("switch", { name: "Modo endurecido" });
    expect(el).toBeDisabled();
    expect(el).toHaveAttribute("aria-disabled", "true");
    expect(el.className).toContain("cursor-wait");
    expect(el.className).toContain("opacity-60");
  });
});
