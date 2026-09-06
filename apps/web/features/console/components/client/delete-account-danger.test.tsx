import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAccountDanger } from "./delete-account-danger";

const { deleteAccountActionMock, pushMock } = vi.hoisted(() => ({
  deleteAccountActionMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/features/console/actions", () => ({ deleteAccountAction: deleteAccountActionMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

beforeEach(() => {
  deleteAccountActionMock.mockReset();
  pushMock.mockReset();
});

describe("DeleteAccountDanger", () => {
  it("botão de excluir do diálogo só habilita depois do id e do motivo — nunca chama a ação antes disso", async () => {
    render(<DeleteAccountDanger accountId="conta-42" maskedEmail="j***@exemplo.test" />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    const botaoConfirmar = screen.getByRole("button", { name: "Excluir de verdade" });
    expect(botaoConfirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    expect(botaoConfirmar).toBeDisabled();

    expect(deleteAccountActionMock).not.toHaveBeenCalled();
  });

  it("caminho feliz: chama a action com o motivo digitado e navega para a lista de contas", async () => {
    deleteAccountActionMock.mockResolvedValueOnce({ ok: true });
    render(<DeleteAccountDanger accountId="conta-42" maskedEmail="j***@exemplo.test" />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido do titular via e-mail");
    await userEvent.click(screen.getByRole("button", { name: "Excluir de verdade" }));

    expect(deleteAccountActionMock).toHaveBeenCalledWith("conta-42", "pedido do titular via e-mail");
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/console/accounts"));
  });

  it("erro de autorização aparece no diálogo sem navegar", async () => {
    deleteAccountActionMock.mockResolvedValueOnce({ ok: false, error: "ator sem a capacidade lgpd.delete_account" });
    render(<DeleteAccountDanger accountId="conta-42" maskedEmail="j***@exemplo.test" />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido do titular");
    await userEvent.click(screen.getByRole("button", { name: "Excluir de verdade" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ator sem a capacidade");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
