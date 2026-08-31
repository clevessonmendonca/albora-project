import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrintedCopyCard, printedCopyRotation } from "./printed-copy-card";

describe("printedCopyRotation", () => {
  it("é determinística por índice, nunca aleatória", () => {
    expect(printedCopyRotation(0)).toBe(-3.5);
    expect(printedCopyRotation(1)).toBe(5.5);
    expect(printedCopyRotation(0)).toBe(printedCopyRotation(0));
    expect(printedCopyRotation(12)).toBe(printedCopyRotation(2));
  });
});

describe("PrintedCopyCard", () => {
  it("renderiza foto e legenda", () => {
    render(
      <PrintedCopyCard
        imageUrl="https://exemplo.test/thumb.jpg"
        caption="22:14 · 3 curtidas"
        index={0}
        alt="Foto da festa"
      />,
    );

    expect(screen.getByRole("img", { name: "Foto da festa" })).toHaveAttribute(
      "src",
      "https://exemplo.test/thumb.jpg",
    );
    expect(screen.getByText("22:14 · 3 curtidas")).toBeInTheDocument();
  });

  it("marca seleção quando interativo", () => {
    render(
      <PrintedCopyCard
        imageUrl="/thumb.jpg"
        caption="21:05"
        index={2}
        selected
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { pressed: true })).toBeInTheDocument();
  });
});
