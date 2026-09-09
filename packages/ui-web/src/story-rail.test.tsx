import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoryRail, type StoryItem } from "./story-rail";

const items: StoryItem[] = [
  { id: "1", nome: "Ana" },
  { id: "2", nome: "Bia", novo: true },
  { id: "3", nome: "Caio" },
];

describe("StoryRail", () => {
  it("renderiza os 3 items recebidos mais o item Você", () => {
    render(<StoryRail items={items} />);

    expect(screen.getByRole("button", { name: "Você" })).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Bia")).toBeInTheDocument();
    expect(screen.getByText("Caio")).toBeInTheDocument();
  });

  it("marca com o anel de destaque âmbar só o item com novo: true", () => {
    render(<StoryRail items={items} />);

    const bia = screen.getByText("Bia").previousSibling as HTMLElement;
    const ana = screen.getByText("Ana").previousSibling as HTMLElement;

    expect(bia.className).toContain("ring-acento");
    expect(ana.className).not.toContain("ring-acento");
  });

  it("o recado ganha anel especial (com folga) e selo de áudio, distinto do 'novo'", () => {
    const comRecado: StoryItem[] = [
      { id: "r", nome: "Recado", variant: "recado", temAudio: true, onPress: vi.fn() },
      ...items,
    ];
    render(<StoryRail items={comRecado} />);

    const recadoLabel = screen.getByText("Recado");
    const wrapper = recadoLabel.previousSibling as HTMLElement;
    const squircle = wrapper.firstChild as HTMLElement;
    // Anel com folga marca o recado; "novo" (Bia) usa o anel rente, sem offset.
    expect(squircle.className).toContain("ring-offset");
    const bia = screen.getByText("Bia").previousSibling as HTMLElement;
    expect(bia.className).not.toContain("ring-offset");
    // Selo de áudio presente no recado.
    expect(wrapper.querySelector("svg")).not.toBeNull();
  });

  it("recado sem áudio não mostra o selo", () => {
    render(<StoryRail items={[{ id: "r", nome: "Recado", variant: "recado" }]} />);
    const wrapper = screen.getByText("Recado").previousSibling as HTMLElement;
    expect(wrapper.querySelector("svg")).toBeNull();
  });

  it("chama onAdd ao clicar em Você", () => {
    const onAdd = vi.fn();
    render(<StoryRail items={items} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole("button", { name: "Você" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
