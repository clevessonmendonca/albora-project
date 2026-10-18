import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ColorField } from "./color-field";
import { DateTimeField } from "./datetime-field";

function ComCor() {
  const [v, setV] = useState("rgb(51, 102, 153)");
  return (
    <>
      <ColorField label="Cor principal" value={v} onChange={setV} />
      <input aria-label="Outro campo" />
    </>
  );
}

describe("foco dos seletores em popover", () => {
  it("cor: abrir leva o foco para dentro e Esc devolve ao botão", async () => {
    render(<ComCor />);
    const gatilho = screen.getByRole("button", { name: /Cor principal/ });
    await userEvent.click(gatilho);
    const dialogo = screen.getByRole("dialog", { name: "Escolher cor" });
    expect(dialogo.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it("cor: clicar em outro campo fecha sem roubar o foco dele", async () => {
    render(<ComCor />);
    await userEvent.click(screen.getByRole("button", { name: /Cor principal/ }));
    const outro = screen.getByLabelText("Outro campo");
    await userEvent.click(outro);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(outro);
  });

  it("data: abrir leva o foco para dentro e Esc devolve ao botão", async () => {
    render(<DateTimeField value="" onChange={() => {}} label="Data" />);
    const gatilho = screen.getByRole("button", { name: /Escolher data e hora/ });
    await userEvent.click(gatilho);
    expect(screen.getByRole("dialog", { name: "Escolher data e hora" }).contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(document.activeElement).toBe(gatilho);
  });
});
