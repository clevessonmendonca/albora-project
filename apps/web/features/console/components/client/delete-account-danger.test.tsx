import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAccountDanger } from "./delete-account-danger";

const { createDsarRequestActionMock, pushMock } = vi.hoisted(() => ({
  createDsarRequestActionMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/features/console/actions", () => ({ createDsarRequestAction: createDsarRequestActionMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

beforeEach(() => {
  createDsarRequestActionMock.mockReset();
  pushMock.mockReset();
});

describe("DeleteAccountDanger", () => {
  it("botão de abrir pedido só habilita depois do id, do prazo e do motivo — nunca chama a ação antes disso", async () => {
    render(<DeleteAccountDanger accountId="conta-42" maskedEmail="j***@exemplo.test" />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    const botaoConfirmar = screen.getByRole("button", { name: "Abrir pedido" });
    expect(botaoConfirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    expect(botaoConfirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Motivo"), "pedido do titular via e-mail");
    expect(botaoConfirmar).toBeDisabled();

    expect(createDsarRequestActionMock).not.toHaveBeenCalled();
  });

  it("caminho feliz: abre um pedido DSAR de exclusão (nunca chama a purga direto) e navega para a tela LGPD", async () => {
    createDsarRequestActionMock.mockResolvedValueOnce({ ok: true });
    render(<DeleteAccountDanger accountId="conta-42" maskedEmail="j***@exemplo.test" />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    await userEvent.type(screen.getByLabelText("Prazo legal"), "2026-12-01");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido do titular via e-mail");
    await userEvent.click(screen.getByRole("button", { name: "Abrir pedido" }));

    expect(createDsarRequestActionMock).toHaveBeenCalledWith(
      "deletion",
      "conta-42",
      "2026-12-01",
      "pedido do titular via e-mail",
    );
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/console/lgpd"));
  });

  it("erro ao abrir o pedido aparece no diálogo sem navegar", async () => {
    createDsarRequestActionMock.mockResolvedValueOnce({ ok: false, error: "motivo é obrigatório" });
    render(<DeleteAccountDanger accountId="conta-42" maskedEmail="j***@exemplo.test" />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    await userEvent.type(screen.getByLabelText("Prazo legal"), "2026-12-01");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido do titular");
    await userEvent.click(screen.getByRole("button", { name: "Abrir pedido" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("motivo é obrigatório");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
