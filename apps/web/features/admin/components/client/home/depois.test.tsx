import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Payoffdepois } from "./depois";
import type { Payoff } from "@/features/admin/data/load-home-state";

function payoff(overrides: Partial<Payoff> = {}): Payoff {
  return { fotos: 120, pessoas: 40, destacadas: 0, novas: 0, horas: 0, ...overrides };
}

describe("Payoffdepois — Favoritas", () => {
  it("sem foto destacada, não mostra um bloco vazio", () => {
    render(<Payoffdepois base="/admin/e/1" payoff={payoff()} />);
    expect(screen.queryByText(/destacaram/)).not.toBeInTheDocument();
  });

  it("com favoritas, mostra a contagem e para onde leva", () => {
    render(<Payoffdepois base="/admin/e/1" payoff={payoff({ destacadas: 1 })} />);
    const link = screen.getByRole("link", { name: /1 foto que vocês destacaram/ });
    expect(link).toHaveAttribute("href", "/admin/e/1/album?aba=destaques");
  });

  it("no plural, concorda o texto com mais de uma foto", () => {
    render(<Payoffdepois base="/admin/e/1" payoff={payoff({ destacadas: 7 })} />);
    expect(screen.getByText("7 fotos que vocês destacaram")).toBeInTheDocument();
  });

  it("Guardar suas fotos não repete o atalho das favoritas", () => {
    render(<Payoffdepois base="/admin/e/1" payoff={payoff({ destacadas: 7 })} />);
    expect(screen.queryByText("Só as favoritas")).not.toBeInTheDocument();
  });
});
