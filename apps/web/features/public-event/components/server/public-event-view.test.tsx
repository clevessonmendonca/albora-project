import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicEventView } from "./public-event-view";

const BASE_PROPS = {
  nomeDoEvento: "ANA & JOÃO",
  dataDoEvento: "15 de agosto de 2026",
  mensagemVazia: "As primeiras fotos aparecem aqui",
  ctaHref: "/admin/new?plano=free",
};

describe("PublicEventView", () => {
  it("mostra a prova social e a vitrine quando o evento está aberto", () => {
    render(
      <PublicEventView
        {...BASE_PROPS}
        estado="aberto"
        totalFotos={847}
        totalPessoas={132}
        vitrine={[
          { id: "foto-1", url: "https://r2.example/foto-1.jpg" },
          { id: "foto-2", url: "https://r2.example/foto-2.jpg" },
        ]}
      />,
    );

    expect(screen.getByText("847")).toBeInTheDocument();
    expect(screen.getByText("fotos")).toBeInTheDocument();
    expect(screen.getByText("132")).toBeInTheDocument();
    expect(screen.getByText("pessoas")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Fotos moderadas do álbum" })).toBeInTheDocument();
    expect(screen.getByText("Monte o álbum da sua festa")).toBeInTheDocument();
  });

  it("nunca renderiza nome de convidado — só id e url chegam na vitrine", () => {
    const { container } = render(
      <PublicEventView
        {...BASE_PROPS}
        estado="aberto"
        totalFotos={1}
        totalPessoas={1}
        vitrine={[{ id: "foto-1", url: "https://r2.example/foto-1.jpg" }]}
      />,
    );

    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("alt")).toBe("");
    }
  });

  it("mostra a mensagem de vazio quando não há foto moderada ainda", () => {
    render(
      <PublicEventView {...BASE_PROPS} estado="aberto" totalFotos={0} totalPessoas={0} vitrine={[]} />,
    );

    expect(screen.getByText(BASE_PROPS.mensagemVazia)).toBeInTheDocument();
  });

  it("antes de começar, esconde a prova social em vez de mostrar zero", () => {
    render(
      <PublicEventView estado="nao_comecou" {...BASE_PROPS} totalFotos={0} totalPessoas={0} vitrine={[]} />,
    );

    expect(screen.queryByText("fotos")).not.toBeInTheDocument();
    expect(screen.queryByText("pessoas")).not.toBeInTheDocument();
  });

  it("depois de encerrado, mostra o rótulo e mantém a prova social", () => {
    render(
      <PublicEventView
        {...BASE_PROPS}
        estado="encerrado"
        totalFotos={900}
        totalPessoas={140}
        vitrine={[]}
      />,
    );

    expect(screen.getByText("Álbum encerrado")).toBeInTheDocument();
    expect(screen.getByText("900")).toBeInTheDocument();
  });

  it("o CTA aponta pro fluxo de criação, nunca pra tela de login", () => {
    render(
      <PublicEventView {...BASE_PROPS} estado="aberto" totalFotos={0} totalPessoas={0} vitrine={[]} />,
    );

    expect(screen.getByText("Monte o álbum da sua festa").closest("a")).toHaveAttribute(
      "href",
      "/admin/new?plano=free",
    );
  });
});
