import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("elevation por padrão mapeia para elev-1", () => {
    render(<Card>x</Card>);
    expect(screen.getByText("x").className).toMatch(/\belev-1\b/);
  });

  it("mapeia elevation para a classe elev-* correspondente", () => {
    const { rerender } = render(<Card elevation={1}>x</Card>);
    expect(screen.getByText("x").closest("[class*='elev-']")?.className).toMatch(/\belev-1\b/);

    rerender(<Card elevation={2}>x</Card>);
    expect(screen.getByText("x").closest("[class*='elev-']")?.className).toMatch(/\belev-2\b/);

    rerender(<Card elevation={0}>x</Card>);
    expect(screen.getByText("x").closest("[class*='elev-']")?.className).toMatch(/\belev-0\b/);
  });

  it("preserva o destaque (highlighted) independente da elevação", () => {
    render(
      <Card elevation={2} highlighted>
        x
      </Card>,
    );
    expect(screen.getByText("x").className).toMatch(/bg-acento-superficie\b/);
  });

  it("preserva className extra do chamador", () => {
    render(<Card className="minha-classe">x</Card>);
    expect(screen.getByText("x").className).toMatch(/minha-classe\b/);
  });
});
