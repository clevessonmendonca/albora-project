import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Payoffdepois } from "./depois";
import type { Payoff } from "@/features/admin/data/load-home-state";
import type { CapituloDoReviver } from "@/features/admin/lib/reviver";

const FUSO = "America/Sao_Paulo";

function payoff(overrides: Partial<Payoff> = {}): Payoff {
  return { fotos: 120, pessoas: 40, destacadas: 0, novas: 0, horas: 0, ...overrides };
}

function capitulo(id: string, titulo: string, em: string, fotos: number): CapituloDoReviver {
  return {
    id,
    titulo,
    descricao: "descrição",
    em,
    capa: { id, thumb: `https://exemplo/${id}`, em, destacada: false },
    fotos,
  };
}

function renderDepois(
  overrides: Partial<Payoff> = {},
  capitulos: CapituloDoReviver[] = [],
) {
  return render(
    <Payoffdepois base="/admin/e/1" payoff={payoff(overrides)} capitulos={capitulos} fuso={FUSO} />,
  );
}

describe("Payoffdepois — Favoritas", () => {
  it("sem foto destacada, não mostra um bloco vazio", () => {
    renderDepois();
    expect(screen.queryByText(/destacaram/)).not.toBeInTheDocument();
  });

  it("com favoritas, mostra a contagem e para onde leva", () => {
    renderDepois({ destacadas: 1 });
    const link = screen.getByRole("link", { name: /1 foto que vocês destacaram/ });
    expect(link).toHaveAttribute("href", "/admin/e/1/album?aba=destaques");
  });

  it("no plural, concorda o texto com mais de uma foto", () => {
    renderDepois({ destacadas: 7 });
    expect(screen.getByText("7 fotos que vocês destacaram")).toBeInTheDocument();
  });

  it("Guardar suas fotos não repete o atalho das favoritas", () => {
    renderDepois({ destacadas: 7 });
    expect(screen.queryByText("Só as favoritas")).not.toBeInTheDocument();
  });
});

describe("Payoffdepois — Momentos da noite", () => {
  it("sem capítulo, não mostra a seção", () => {
    renderDepois();
    expect(screen.queryByText("Momentos da noite")).not.toBeInTheDocument();
  });

  it("com capítulos, mostra título, hora e contagem de fotos — não o funil de participação", () => {
    renderDepois({}, [capitulo("a", "Cerimônia", "2026-09-20T20:15:00.000Z", 12)]);

    expect(screen.getByText("Momentos da noite")).toBeInTheDocument();
    expect(screen.getByText("Cerimônia")).toBeInTheDocument();
    expect(screen.getByText(/12 fotos/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /insights/i })).not.toBeInTheDocument();
  });

  it("no singular, concorda o texto com uma única foto", () => {
    renderDepois({}, [capitulo("a", "Chegadas", "2026-09-20T18:30:00.000Z", 1)]);
    expect(screen.getByText(/1 foto\b/)).toBeInTheDocument();
  });

  it("respeita a ordem dos capítulos, não reordena por nome ou hora", () => {
    renderDepois({}, [
      capitulo("a", "Chegadas", "2026-09-20T18:30:00.000Z", 6),
      capitulo("b", "Cerimônia", "2026-09-20T20:15:00.000Z", 0),
      capitulo("c", "Jantar", "2026-09-20T21:40:00.000Z", 7),
    ]);

    const titulos = screen.getAllByText(/Chegadas|Cerimônia|Jantar/).map((el) => el.textContent);
    expect(titulos).toEqual(["Chegadas", "Cerimônia", "Jantar"]);
  });
});
