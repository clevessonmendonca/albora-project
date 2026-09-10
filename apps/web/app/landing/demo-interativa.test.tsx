import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoInterativa, type FotoDemo } from "./demo-interativa";

const FOTOS: FotoDemo[] = [
  { src: "/a.png", alt: "Foto A" },
  { src: "/b.png", alt: "Foto B" },
  { src: "/c.png", alt: "Foto C" },
];
const FOTO_EXEMPLO: FotoDemo = { src: "/x.png", alt: "Foto de exemplo enviada" };

function renderDemo() {
  render(
    <DemoInterativa
      nomeExemplo="ANA & JOÃO"
      albumSub="Um dia. Muitos olhares."
      placeholder="Ex.: a nossa festa"
      fotos={FOTOS}
      fotoExemplo={FOTO_EXEMPLO}
      telaoVars={{}}
      qr={<div data-testid="qr-slot" />}
    />,
  );
}

const album = () => screen.getByRole("group", { name: "Prévia de um álbum coletivo" });

describe("DemoInterativa", () => {
  it("parte do estado inicial: nome de exemplo, 3 fotos, status e slot do QR", () => {
    renderDemo();
    expect(within(album()).getByRole("heading", { level: 3 })).toHaveTextContent("ANA & JOÃO");
    expect(album()).toHaveTextContent("3 fotos");
    expect(screen.getByRole("status")).toHaveTextContent("Experimente enviar a primeira foto.");
    expect(screen.getByTestId("qr-slot")).toBeInTheDocument();
    expect(screen.queryByAltText("Foto de exemplo enviada")).not.toBeInTheDocument();
  });

  it("personaliza o álbum com o nome digitado", () => {
    renderDemo();
    const input = screen.getByLabelText("Qual é o nome da sua festa?");
    fireEvent.change(input, { target: { value: "Festa da Bia" } });
    fireEvent.submit(input.closest("form")!);
    expect(within(album()).getByRole("heading", { level: 3 })).toHaveTextContent("Festa da Bia");
    expect(screen.getByRole("status")).toHaveTextContent("Sua prévia está pronta.");
  });

  it("não personaliza com nome vazio", () => {
    renderDemo();
    const input = screen.getByLabelText("Qual é o nome da sua festa?");
    fireEvent.submit(input.closest("form")!);
    expect(within(album()).getByRole("heading", { level: 3 })).toHaveTextContent("ANA & JOÃO");
  });

  it("alterna entre álbum e telão via aria-pressed e classe de tela", () => {
    renderDemo();
    const noAlbum = screen.getByRole("button", { name: "No álbum" });
    const noTelao = screen.getByRole("button", { name: "No telão" });
    expect(noAlbum).toHaveAttribute("aria-pressed", "true");
    expect(album()).not.toHaveClass("demo-album-tela");

    fireEvent.click(noTelao);
    expect(noTelao).toHaveAttribute("aria-pressed", "true");
    expect(noAlbum).toHaveAttribute("aria-pressed", "false");
    expect(album()).toHaveClass("demo-album-tela");
  });

  it("envia e recomeça a foto de exemplo, atualizando contagem, status e rótulo", () => {
    renderDemo();
    const botao = screen.getByRole("button", { name: "Enviar uma foto de exemplo" });

    fireEvent.click(botao);
    expect(album()).toHaveTextContent("4 fotos");
    expect(screen.getByAltText("Foto de exemplo enviada")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Foto de exemplo adicionada.");
    expect(screen.getByRole("button", { name: "Recomeçar demonstração" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recomeçar demonstração" }));
    expect(album()).toHaveTextContent("3 fotos");
    expect(screen.queryByAltText("Foto de exemplo enviada")).not.toBeInTheDocument();
    expect(screen.getByText("Sua próxima lembrança")).toBeInTheDocument();
  });
});
