import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoInterativa, type FotoDemo } from "./demo-interativa";

const FOTOS: FotoDemo[] = [
  { src: "/a.png", alt: "Foto A" },
  { src: "/b.png", alt: "Foto B" },
  { src: "/c.png", alt: "Foto C" },
  { src: "/d.png", alt: "Foto D" },
];

function renderDemo() {
  render(
    <DemoInterativa
      nomeExemplo="ANA & JOÃO"
      albumSub="Um dia. Muitos olhares."
      placeholder="Ex.: nossa festa"
      fotos={FOTOS}
      hrefBase="/admin/new?plano=free"
      packId="casamento"
    />,
  );
}

const album = () => screen.getByRole("group", { name: "Prévia de um álbum coletivo" });
const cta = () => screen.getByRole("link", { name: /Criar meu evento/ });

describe("DemoInterativa", () => {
  it("mostra o nome de exemplo e o CTA aponta para o funil base quando vazio", () => {
    renderDemo();
    expect(within(album()).getByRole("heading", { level: 3 })).toHaveTextContent("ANA & JOÃO");
    expect(cta()).toHaveAttribute("href", "/admin/new?plano=free");
    expect(album()).toHaveTextContent("4 fotos");
  });

  it("atualiza o título do álbum ao vivo conforme digita", () => {
    renderDemo();
    fireEvent.change(screen.getByLabelText("Qual é o nome da sua festa?"), {
      target: { value: "Festa da Bia" },
    });
    expect(within(album()).getByRole("heading", { level: 3 })).toHaveTextContent("Festa da Bia");
  });

  it("leva o nome digitado para a criação do evento (?nome=)", () => {
    renderDemo();
    fireEvent.change(screen.getByLabelText("Qual é o nome da sua festa?"), {
      target: { value: "Bia & Pedro" },
    });
    expect(cta()).toHaveAttribute(
      "href",
      "/admin/new?plano=free&nome=" + encodeURIComponent("Bia & Pedro"),
    );
  });

  it("ignora espaços em branco e volta ao exemplo", () => {
    renderDemo();
    const input = screen.getByLabelText("Qual é o nome da sua festa?");
    fireEvent.change(input, { target: { value: "   " } });
    expect(within(album()).getByRole("heading", { level: 3 })).toHaveTextContent("ANA & JOÃO");
    expect(cta()).toHaveAttribute("href", "/admin/new?plano=free");
  });
});
