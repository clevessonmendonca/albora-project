import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppearanceStep } from "./appearance-step";
import type * as TokensModule from "@albora/tokens";
import { COLOR_COMBOS } from "./appearance-data";

const contrasteMock = vi.hoisted(() => ({ valor: null as number | null }));
vi.mock("@albora/tokens", async (importOriginal) => {
  const real = await importOriginal<typeof TokensModule>();
  return { ...real, eventOnContrast: (cor: string) => contrasteMock.valor ?? real.eventOnContrast(cor) };
});

const combo = COLOR_COMBOS[0]!;

function montar(cor: string, cor2: string, onColor = vi.fn()) {
  render(
    <AppearanceStep
      styleKey="editorial"
      onStyle={() => {}}
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
  afterEach(() => { contrasteMock.valor = null; });

  it("cor legível não mostra aviso nenhum e deixa as cores recolhidas", () => {
    montar(combo.cor, combo.cor2);
    expect(screen.queryByText(/Contraste baixo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Boa leitura/)).not.toBeInTheDocument();
    expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(false);
  });

  it("cor com contraste baixo avisa e abre as cores", () => {
    contrasteMock.valor = 3;
    montar(combo.cor, combo.cor2);
    expect(screen.getByText(/Contraste baixo/)).toBeInTheDocument();
    expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(true);
  });

  it("Trocar ordem inverte principal e detalhe", () => {
    const onColor = montar(combo.cor, combo.cor2);
    fireEvent.click(screen.getByRole("button", { name: "Trocar ordem" }));
    expect(onColor).toHaveBeenCalledWith("cor", combo.cor2);
    expect(onColor).toHaveBeenCalledWith("cor2", combo.cor);
  });
});
