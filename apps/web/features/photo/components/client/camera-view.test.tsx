import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CameraView } from "./camera-view";

const PLACES = [
  { id: "salao", title: "Salão" },
  { id: "pista", title: "Pista" },
];

function setup(overrides: Partial<Parameters<typeof CameraView>[0]> = {}) {
  const onBack = vi.fn();
  const onShutter = vi.fn();
  const onRoll = vi.fn();
  const onPlace = vi.fn();

  render(
    <CameraView
      eventTitle="Ana & João"
      mission={{ index: 1, total: 3, title: "Foto com os padrinhos" }}
      places={PLACES}
      activePlaceId={null}
      onPlace={onPlace}
      recentThumbs={[]}
      processing={false}
      onShutter={onShutter}
      onRoll={onRoll}
      onBack={onBack}
      {...overrides}
    />,
  );

  return { onBack, onShutter, onRoll, onPlace };
}

describe("CameraView", () => {
  it("sempre renderiza um jeito de voltar, e chama onBack ao tocar", () => {
    const { onBack } = setup();

    const voltar = screen.getByRole("button", { name: "Voltar" });
    expect(screen.getByRole("link", { name: "Ir para o conteúdo" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    fireEvent.click(voltar);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("dispara onShutter ao tocar no obturador", () => {
    const { onShutter } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Fotografar" }));

    expect(onShutter).toHaveBeenCalledTimes(1);
  });

  it("dispara onRoll ao tocar no acesso ao rolo, mesmo sem fotos recentes", () => {
    const { onRoll } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Abrir rolo de fotos" }));

    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it("mostra a foto real do convidado como miniatura do rolo quando existe uma recente", () => {
    setup({ recentThumbs: ["blob:recente-1"] });

    const miniatura = screen.getByRole("button", { name: "Abrir rolo de fotos" }).querySelector("img");
    expect(miniatura).toHaveAttribute("src", "blob:recente-1");
  });

  it("mostra a missão e os lugares sobrepostos ao visor", () => {
    setup();

    expect(screen.getByText("Foto com os padrinhos")).toBeInTheDocument();
    expect(screen.getByText("Salão")).toBeInTheDocument();
    expect(screen.getByText("Pista")).toBeInTheDocument();
  });

  it("desabilita obturador e rolo enquanto processa a foto anterior", () => {
    setup({ processing: true });

    expect(screen.getByRole("button", { name: "Fotografar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abrir rolo de fotos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeEnabled();
  });

  it("não hardcoda hex nas classes — só tokens semânticos", () => {
    const { container } = render(
      <CameraView
        eventTitle="Ana & João"
        places={[]}
        activePlaceId={null}
        onPlace={vi.fn()}
        recentThumbs={[]}
        processing={false}
        onShutter={vi.fn()}
        onRoll={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    for (const el of container.querySelectorAll("[class]")) {
      expect(el.getAttribute("class") ?? "").not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
