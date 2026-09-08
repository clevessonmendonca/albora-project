import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerDialog } from "./danger-dialog";

describe("DangerDialog", () => {
  it("botão de confirmar fica desabilitado até digitar o identificador exato e um motivo", async () => {
    const onConfirm = vi.fn();
    render(
      <DangerDialog
        open
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Excluir conta?"
        whatWillBeDeleted={<p>Apaga tudo.</p>}
        confirmationValue="conta-42"
      />,
    );
    const botao = screen.getByRole("button", { name: "Excluir de verdade" });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-errada");
    expect(botao).toBeDisabled();
  });

  it("identificador certo mas sem motivo continua desabilitado", async () => {
    render(
      <DangerDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Excluir conta?"
        whatWillBeDeleted={<p>Apaga tudo.</p>}
        confirmationValue="conta-42"
      />,
    );
    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    expect(screen.getByRole("button", { name: "Excluir de verdade" })).toBeDisabled();
  });

  it("com identificador exato e motivo, confirma passando o motivo", async () => {
    const onConfirm = vi.fn();
    render(
      <DangerDialog
        open
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Excluir conta?"
        whatWillBeDeleted={<p>Apaga tudo.</p>}
        confirmationValue="conta-42"
      />,
    );
    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido do titular");
    await userEvent.click(screen.getByRole("button", { name: "Excluir de verdade" }));
    expect(onConfirm).toHaveBeenCalledWith("pedido do titular");
  });

  it("mostra o que será apagado antes de qualquer confirmação", () => {
    render(
      <DangerDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Excluir conta?"
        whatWillBeDeleted={<p>Apaga os eventos e as fotos desta conta.</p>}
        confirmationValue="conta-42"
      />,
    );
    expect(screen.getByText("Apaga os eventos e as fotos desta conta.")).toBeInTheDocument();
  });

  it("pending desabilita os dois botões", () => {
    render(
      <DangerDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Excluir conta?"
        whatWillBeDeleted={<p>Apaga tudo.</p>}
        confirmationValue="conta-42"
        pending
      />,
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excluindo…" })).toBeDisabled();
  });
});
