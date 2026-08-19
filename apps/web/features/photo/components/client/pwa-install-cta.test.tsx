import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PwaInstallCta } from "./pwa-install-cta";

function setup(overrides: Partial<Parameters<typeof PwaInstallCta>[0]> = {}) {
  const onInstalar = vi.fn();
  const onDispensar = vi.fn();
  const onPromptIos = vi.fn();

  render(
    <PwaInstallCta
      mostrar={true}
      promptNativo={true}
      precisaInstrucaoIos={false}
      onInstalar={onInstalar}
      onDispensar={onDispensar}
      onPromptIos={onPromptIos}
      {...overrides}
    />,
  );

  return { onInstalar, onDispensar, onPromptIos };
}

describe("PwaInstallCta", () => {
  it("não renderiza nada quando mostrar é falso, ainda que haja caminho de instalar", () => {
    setup({ mostrar: false });

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("Android com prompt nativo: mostra o botão de instalar e dispara onInstalar", () => {
    const { onInstalar } = setup({ promptNativo: true, precisaInstrucaoIos: false });

    fireEvent.click(screen.getByRole("button", { name: "Instalar na tela inicial" }));

    expect(onInstalar).toHaveBeenCalledTimes(1);
  });

  it("iOS sem prompt nativo: mostra o passo a passo de Compartilhar e avisa onPromptIos", () => {
    const { onPromptIos } = setup({ promptNativo: false, precisaInstrucaoIos: true });

    expect(screen.getByText("Toque em Compartilhar")).toBeTruthy();
    expect(screen.getByText("Adicionar à Tela de Início")).toBeTruthy();
    expect(onPromptIos).toHaveBeenCalledTimes(1);
  });

  it("dispensar chama onDispensar, sempre disponível", () => {
    const { onDispensar } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));

    expect(onDispensar).toHaveBeenCalledTimes(1);
  });
});
