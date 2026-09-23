import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AjudaDoPainel } from "./ajuda-do-painel";
import { GLOSSARIO } from "@/features/admin/lib/glossario";

describe("AjudaDoPainel", () => {
  it("o botão diz o que faz, não é ícone mudo", () => {
    render(<AjudaDoPainel />);

    expect(screen.getByRole("button", { name: /ajuda/i })).toBeInTheDocument();
  });

  it("começa fechada: ninguém é obrigado a ler nada", () => {
    render(<AjudaDoPainel />);

    const folha = screen.getByText(GLOSSARIO[0]!.frase).closest("dialog");
    expect(folha).toHaveAttribute("data-state", "closed");
  });

  it("abre com os sete termos e suas frases", async () => {
    const user = userEvent.setup();
    render(<AjudaDoPainel />);

    await user.click(screen.getByRole("button", { name: /ajuda/i }));

    for (const termo of GLOSSARIO) {
      expect(screen.getByText(termo.termo)).toBeInTheDocument();
      expect(screen.getByText(termo.frase)).toBeInTheDocument();
    }
  });
});
