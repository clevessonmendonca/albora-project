import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFocoDoModal } from "./use-foco-do-modal";

function Modal({ onFechar }: { onFechar: () => void }) {
  const ref = useFocoDoModal<HTMLDivElement>();
  return (
    <div ref={ref} role="dialog" aria-label="m" tabIndex={-1}>
      <button type="button">primeiro</button>
      <button type="button" onClick={onFechar}>
        ultimo
      </button>
    </div>
  );
}

function Pagina() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        abrir
      </button>
      {aberto && <Modal onFechar={() => setAberto(false)} />}
    </>
  );
}

describe("useFocoDoModal", () => {
  it("leva o foco para dentro, prende o Tab e devolve o foco ao fechar", () => {
    render(<Pagina />);
    const abrir = screen.getByRole("button", { name: "abrir" });
    abrir.focus();
    fireEvent.click(abrir);

    const dialogo = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialogo);

    const ultimo = screen.getByRole("button", { name: "ultimo" });
    ultimo.focus();
    fireEvent.keyDown(ultimo, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "primeiro" }));

    fireEvent.click(ultimo);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });
});
