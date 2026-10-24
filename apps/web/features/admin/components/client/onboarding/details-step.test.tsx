import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    render(<DetailsStep {...base} momentos={[{ id: "a", titulo: "A recepção" }, { id: "b", titulo: "A festa" }]} />);
    expect(screen.getByText("Momentos do álbum")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["A recepção", "A festa"]);
  });

  it("sem momentos, o bloco não aparece", () => {
    render(<DetailsStep {...base} />);
    expect(screen.queryByText("Momentos do álbum")).not.toBeInTheDocument();
  });

  it("com edição ligada, adiciona, renomeia, remove e reordena", () => {
    const onMomentos = vi.fn();
    const m = [
      { id: "a", titulo: "A recepção" },
      { id: "b", titulo: "A festa" },
    ];
    render(<DetailsStep {...base} momentos={m} momentosPadrao={m} onMomentos={onMomentos} />);
    fireEvent.change(screen.getByLabelText("Nome do momento 1"), { target: { value: "Cerimônia" } });
    expect(onMomentos).toHaveBeenLastCalledWith([{ id: "a", titulo: "Cerimônia" }, m[1]]);
    fireEvent.click(screen.getByRole("button", { name: "Remover A festa" }));
    expect(onMomentos).toHaveBeenLastCalledWith([m[0]]);
    fireEvent.click(screen.getByRole("button", { name: "Descer A recepção" }));
    expect(onMomentos).toHaveBeenLastCalledWith([m[1], m[0]]);
    fireEvent.change(screen.getByLabelText("Novo momento"), { target: { value: "Brinde" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));
    const ultima = onMomentos.mock.calls.at(-1)![0];
    expect(ultima.map((x: { titulo: string }) => x.titulo)).toEqual(["A recepção", "A festa", "Brinde"]);
  });

  it("Alt+seta reordena pelo teclado", () => {
    const onMomentos = vi.fn();
    const m = [
      { id: "a", titulo: "Um" },
      { id: "b", titulo: "Dois" },
    ];
    render(<DetailsStep {...base} momentos={m} momentosPadrao={m} onMomentos={onMomentos} />);
    fireEvent.keyDown(screen.getByLabelText("Nome do momento 2"), { key: "ArrowUp", altKey: true });
    expect(onMomentos).toHaveBeenLastCalledWith([m[1], m[0]]);
  });

  it("avisa nome repetido", () => {
    const m = [
      { id: "a", titulo: "Brinde" },
      { id: "b", titulo: "brinde" },
    ];
    render(<DetailsStep {...base} momentos={m} momentosPadrao={m} onMomentos={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("mesmo nome");
  });
});
