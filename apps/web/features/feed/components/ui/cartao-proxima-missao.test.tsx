import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartaoProximaMissao } from "./cartao-proxima-missao";

describe("CartaoProximaMissao", () => {
  it("leva à câmera da missão com o título dela", () => {
    render(
      <CartaoProximaMissao
        rotulo="Próxima missão"
        missao={{ id: "m1", title: "Uma foto com a turma", emoji: null, href: "/e/x/photo?missao=m1" }}
      />,
    );
    const link = screen.getByTestId("cartao-proxima-missao");
    expect(link.getAttribute("href")).toBe("/e/x/photo?missao=m1");
    expect(screen.getByText("Uma foto com a turma")).toBeTruthy();
    expect(screen.getByText("Próxima missão")).toBeTruthy();
  });
});
