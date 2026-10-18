import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailsStep } from "./details-step";

const base = {
  title: "",
  onTitle: () => {},
  titlePlaceholder: "Nome",
  titleError: false,
  date: "",
  onDate: () => {},
  dateError: false,
  guests: "",
  onGuests: () => {},
  local: "",
  onLocal: () => {},
};

describe("DetailsStep", () => {
  it("lista os momentos do tipo como chips", () => {
    render(<DetailsStep {...base} momentos={["A recepção", "A festa"]} />);
    expect(screen.getByText("Momentos do álbum")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["A recepção", "A festa"]);
  });

  it("sem momentos, o bloco não aparece", () => {
    render(<DetailsStep {...base} />);
    expect(screen.queryByText("Momentos do álbum")).not.toBeInTheDocument();
  });

  it("local e convidados esperados ficam em Mais detalhes, fechado quando vazios", () => {
    const { container } = render(<DetailsStep {...base} />);
    const detalhes = container.querySelector("details") as HTMLDetailsElement;
    expect(detalhes.open).toBe(false);
    expect(detalhes).toContainElement(screen.getByLabelText("Local"));
    expect(detalhes).toContainElement(screen.getByLabelText("Convidados esperados"));
    expect(detalhes).not.toContainElement(screen.getByLabelText("Nome do evento"));
  });

  it("volta com Mais detalhes aberto quando já há local", () => {
    const { container } = render(<DetailsStep {...base} local="Espaço Luz" />);
    expect((container.querySelector("details") as HTMLDetailsElement).open).toBe(true);
  });
});
