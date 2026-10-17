import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppearanceStep } from "./appearance-step";
import { COLOR_COMBOS } from "./appearance-data";

const combo = COLOR_COMBOS[0]!;

function montar(cor: string, cor2: string, onColor = vi.fn()) {
  render(
    <AppearanceStep
      styleKey="editorial"
      onStyle={() => {}}
      eventName="Festa"
      coverSrc="/onboarding/photo-01.webp"
      cor={cor}
      cor2={cor2}
      onColor={onColor}
      photoColors={[]}
    />,
  );
  return onColor;
}

describe("AppearanceStep, cores", () => {
  it("cor legível mostra o selo positivo", () => {
    montar(combo.cor, combo.cor2);
    expect(screen.getByText(/Boa leitura/)).toBeInTheDocument();
    expect(screen.queryByText(/Contraste baixo/)).not.toBeInTheDocument();
  });

  it("Trocar ordem inverte principal e detalhe", () => {
    const onColor = montar(combo.cor, combo.cor2);
    fireEvent.click(screen.getByRole("button", { name: "Trocar ordem" }));
    expect(onColor).toHaveBeenCalledWith("cor", combo.cor2);
    expect(onColor).toHaveBeenCalledWith("cor2", combo.cor);
  });
});
