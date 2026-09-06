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

  /*
   * Fechado, o `<dialog>` continua montado (o elemento precisa existir para
   * `showModal`). O estilo de autor `display:grid` da classe base vence o
   * `display:none` do user-agent, então sem uma regra explícita o elemento
   * fechado vira um retângulo `fixed inset-0` com scrim, cobrindo a tela e
   * comendo todo clique. Foi o que travou o E2E do feed do convidado.
   */
  it("fechado, não se anuncia aberto nem fica visível por cima da tela", () => {
    render(
      <Dialog open={false} onClose={() => {}}>
        conteúdo
      </Dialog>,
    );
    const dialogEl = screen.getByText("conteúdo").closest("dialog");
    expect(dialogEl).toHaveAttribute("data-state", "closed");
    expect(dialogEl?.className).toMatch(/\[&:not\(\[open\]\)\]:hidden/);
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
