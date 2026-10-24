import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VejaOAlboraAcontecer } from "./veja-o-albora-acontecer";

describe("VejaOAlboraAcontecer", () => {
  it("mostra os cinco passos numerados na ordem do protótipo", () => {
    render(<VejaOAlboraAcontecer />);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(5);
    expect(itens[0]!.textContent).toContain("01");
    expect(itens[0]!.textContent).toContain("Aponte a câmera no QR");
    expect(itens[4]!.textContent).toContain("E no telão, na hora");
  });
});
