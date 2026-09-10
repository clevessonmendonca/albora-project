// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MolduraPicker } from "./moldura-picker";
import type { EscolhaDeMoldura } from "../../hooks/use-share";

const escolha: EscolhaDeMoldura = {
  uploadId: "u1",
  modelos: ["ambiente", "cheia"],
  recomendado: "ambiente",
};

// jsdom não traz createObjectURL/revokeObjectURL; instala mocks para o arquivo
// (o vitest isola globals por arquivo, então não vaza para outras suites).
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview") as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("MolduraPicker", () => {
  it("abre no modelo recomendado e mostra a prévia real do blob", async () => {
    const onPreview = vi.fn().mockResolvedValue(new Blob(["x"], { type: "image/jpeg" }));
    render(
      <MolduraPicker escolha={escolha} onPreview={onPreview} onConfirmar={vi.fn()} onClose={vi.fn()} />,
    );

    // recomendado pré-selecionado
    expect(screen.getByRole("button", { name: "Ambiente" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Cheia" })).toHaveAttribute("aria-pressed", "false");

    const img = await screen.findByAltText(/prévia da sua foto/i);
    expect(img).toHaveAttribute("src", "blob:preview");
    expect(onPreview).toHaveBeenCalledWith("ambiente");
  });

  it("trocar a moldura re-renderiza a prévia com o modelo escolhido", async () => {
    const onPreview = vi.fn().mockResolvedValue(new Blob(["x"], { type: "image/jpeg" }));
    render(
      <MolduraPicker escolha={escolha} onPreview={onPreview} onConfirmar={vi.fn()} onClose={vi.fn()} />,
    );
    await screen.findByAltText(/prévia da sua foto/i);

    fireEvent.click(screen.getByRole("button", { name: "Cheia" }));

    await waitFor(() => expect(onPreview).toHaveBeenCalledWith("cheia"));
    expect(screen.getByRole("button", { name: "Cheia" })).toHaveAttribute("aria-pressed", "true");
  });

  it("compartilhar entrega o MESMO blob da prévia", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" });
    const onPreview = vi.fn().mockResolvedValue(blob);
    const onConfirmar = vi.fn();
    render(
      <MolduraPicker escolha={escolha} onPreview={onPreview} onConfirmar={onConfirmar} onClose={vi.fn()} />,
    );
    await screen.findByAltText(/prévia da sua foto/i);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar nas redes" }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledWith(blob));
  });

  it("falha ao gerar mostra o estado de borda (§3.5) e não deixa compartilhar", async () => {
    const onPreview = vi.fn().mockRejectedValue(new Error("canvas"));
    render(
      <MolduraPicker escolha={escolha} onPreview={onPreview} onConfirmar={vi.fn()} onClose={vi.fn()} />,
    );

    expect(await screen.findByText(/não deu para montar a imagem/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compartilhar nas redes" })).toBeDisabled();
  });
});
