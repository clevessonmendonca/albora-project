import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reviver } from "./reviver";
import type { CapituloDoReviver } from "@/features/admin/lib/reviver";

function capitulo(id: string): CapituloDoReviver {
  return {
    id,
    titulo: `Capítulo ${id}`,
    descricao: "descrição",
    em: "2026-09-20T20:00:00.000Z",
    capa: { id, thumb: `https://exemplo/${id}`, em: "2026-09-20T20:00:00.000Z", destacada: false },
    fotos: 5,
  };
}

function irParaTelaFinal() {
  fireEvent.click(screen.getByRole("button", { name: "Próximo capítulo" }));
}

describe("Reviver — tela final", () => {
  it("mostra fotos e pessoas, mas não inventa um terceiro número sem duração", () => {
    render(
      <Reviver
        capitulos={[capitulo("a")]}
        fuso="America/Sao_Paulo"
        nome="Ana & João"
        fotos={120}
        pessoas={40}
        horas={0}
        slug="ana-e-joao"
        hrefAlbum="/admin/e/1/album"
        aberto
        onFechar={() => {}}
      />,
    );

    irParaTelaFinal();

    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.queryByText("juntos")).not.toBeInTheDocument();
  });

  it("com duração medida, mostra quantas horas vocês ficaram juntos", () => {
    render(
      <Reviver
        capitulos={[capitulo("a")]}
        fuso="America/Sao_Paulo"
        nome="Ana & João"
        fotos={120}
        pessoas={40}
        horas={6}
        slug="ana-e-joao"
        hrefAlbum="/admin/e/1/album"
        aberto
        onFechar={() => {}}
      />,
    );

    irParaTelaFinal();

    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getByText("juntos")).toBeInTheDocument();
  });

  it("oferece compartilhar o evento, não só rever as fotos", () => {
    render(
      <Reviver
        capitulos={[capitulo("a")]}
        fuso="America/Sao_Paulo"
        nome="Ana & João"
        fotos={120}
        pessoas={40}
        horas={6}
        slug="ana-e-joao"
        hrefAlbum="/admin/e/1/album"
        aberto
        onFechar={() => {}}
      />,
    );

    irParaTelaFinal();

    expect(screen.getByText(/Copiar link · \/e\/ana-e-joao/)).toBeInTheDocument();
  });
});
