import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExecuteAccountDeletionDanger } from "./execute-account-deletion-danger";

const { deleteAccountActionMock } = vi.hoisted(() => ({
  deleteAccountActionMock: vi.fn(),
}));
vi.mock("@/features/console/actions", () => ({ deleteAccountAction: deleteAccountActionMock }));

const rowBase = {
  id: "req-1",
  kind: "deletion" as const,
  subjectAccountId: "conta-1",
  receivedAt: new Date(),
  legalDueAt: new Date(Date.now() + 86_400_000),
  status: "open" as const,
  assigneeStaffId: null,
  evidenceUrl: null,
  completedAt: null,
  notes: null,
};

const assignMock = vi.fn();
Object.defineProperty(window, "location", {
  value: { ...window.location, assign: assignMock },
  writable: true,
});

beforeEach(() => {
  deleteAccountActionMock.mockReset();
  assignMock.mockReset();
});

describe("ExecuteAccountDeletionDanger", () => {
  it("botão de excluir do diálogo só habilita depois do id da conta e do motivo — nunca chama a purga antes disso", async () => {
    render(<ExecuteAccountDeletionDanger row={rowBase} />);

    await userEvent.click(screen.getByRole("button", { name: "Executar exclusão" }));
    const botaoConfirmar = screen.getByRole("button", { name: "Excluir de verdade" });
    expect(botaoConfirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Digite "conta-1" para confirmar'), "conta-1");
    expect(botaoConfirmar).toBeDisabled();

    expect(deleteAccountActionMock).not.toHaveBeenCalled();
  });

  it("caminho feliz: chama a purga com o id do pedido DSAR que autoriza — não só o id da conta", async () => {
    deleteAccountActionMock.mockResolvedValueOnce({ ok: true });
    render(<ExecuteAccountDeletionDanger row={rowBase} />);

    await userEvent.click(screen.getByRole("button", { name: "Executar exclusão" }));
    await userEvent.type(screen.getByLabelText('Digite "conta-1" para confirmar'), "conta-1");
    await userEvent.type(screen.getByLabelText("Motivo"), "titular assinou o termo de exclusão");
    await userEvent.click(screen.getByRole("button", { name: "Excluir de verdade" }));

    expect(deleteAccountActionMock).toHaveBeenCalledWith("conta-1", "req-1", "titular assinou o termo de exclusão");
  });

  it("reautenticação exigida manda pro step-up com next de volta pra /console/lgpd", async () => {
    deleteAccountActionMock.mockResolvedValueOnce({ ok: false, error: "reautenticação exigida", reauthRequired: true });
    render(<ExecuteAccountDeletionDanger row={rowBase} />);

    await userEvent.click(screen.getByRole("button", { name: "Executar exclusão" }));
    await userEvent.type(screen.getByLabelText('Digite "conta-1" para confirmar'), "conta-1");
    await userEvent.type(screen.getByLabelText("Motivo"), "titular assinou o termo de exclusão");
    await userEvent.click(screen.getByRole("button", { name: "Excluir de verdade" }));

    await vi.waitFor(() =>
      expect(assignMock).toHaveBeenCalledWith(`/console/reauth?next=${encodeURIComponent("/console/lgpd")}`),
    );
  });

  it("erro do comando (ex.: pedido já concluído) aparece no diálogo", async () => {
    deleteAccountActionMock.mockResolvedValueOnce({
      ok: false,
      error: "só é possível excluir a conta a partir de um pedido de exclusão (DSAR) aberto para ela",
    });
    render(<ExecuteAccountDeletionDanger row={rowBase} />);

    await userEvent.click(screen.getByRole("button", { name: "Executar exclusão" }));
    await userEvent.type(screen.getByLabelText('Digite "conta-1" para confirmar'), "conta-1");
    await userEvent.type(screen.getByLabelText("Motivo"), "titular assinou o termo de exclusão");
    await userEvent.click(screen.getByRole("button", { name: "Excluir de verdade" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("pedido de exclusão");
  });
});
