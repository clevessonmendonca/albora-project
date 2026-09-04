import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

describe("Dialog", () => {
  it("não usa vidro (backdrop-filter/backdrop-blur) em nenhum estado", () => {
    const { rerender } = render(<Dialog open onClose={() => {}}>conteúdo</Dialog>);
    expect(document.body.innerHTML).not.toMatch(/backdrop-blur|backdrop-filter/);

    rerender(
      <Dialog open={false} onClose={() => {}}>
        conteúdo
      </Dialog>,
    );
    expect(document.body.innerHTML).not.toMatch(/backdrop-blur|backdrop-filter/);
  });

  it("o backdrop usa o token de scrim quente sólido", () => {
    render(<Dialog open onClose={() => {}}>conteúdo</Dialog>);
    const dialogEl = screen.getByText("conteúdo").closest("dialog");
    expect(dialogEl?.className).toMatch(/bg-\[var\(--color-scrim-modal\)\]/);
  });

  it("marca o estado via data-state (open) para a física de entrada/saída", () => {
    render(<Dialog open onClose={() => {}}>conteúdo</Dialog>);
    const dialogEl = screen.getByText("conteúdo").closest("dialog");
    expect(dialogEl).toHaveAttribute("data-state", "open");
  });

  it("clicar no backdrop (fora do conteúdo) chama onClose", () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose}>conteúdo</Dialog>);
    const dialogEl = screen.getByText("conteúdo").closest("dialog") as HTMLElement;
    fireEvent.click(dialogEl);
    expect(onClose).toHaveBeenCalled();
  });

  it("preserva aria-labelledby repassado", () => {
    render(
      <Dialog open onClose={() => {}} aria-labelledby="titulo-x">
        conteúdo
      </Dialog>,
    );
    const dialogEl = screen.getByText("conteúdo").closest("dialog");
    expect(dialogEl).toHaveAttribute("aria-labelledby", "titulo-x");
  });
});
