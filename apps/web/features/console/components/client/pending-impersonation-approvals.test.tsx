import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingImpersonationApprovals } from "./pending-impersonation-approvals";

const { approveImpersonationActionMock, denyImpersonationActionMock, refreshMock } = vi.hoisted(() => ({
  approveImpersonationActionMock: vi.fn(),
  denyImpersonationActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));
vi.mock("@/features/console/actions", () => ({
  approveImpersonationAction: approveImpersonationActionMock,
  denyImpersonationAction: denyImpersonationActionMock,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

beforeEach(() => {
  approveImpersonationActionMock.mockReset();
  denyImpersonationActionMock.mockReset();
  refreshMock.mockReset();
});

function pedido(overrides: Partial<Parameters<typeof PendingImpersonationApprovals>[0]["requests"][number]> = {}) {
  return {
    id: "imp-2",
    requesterStaffId: "s1",
    targetAccountId: "conta-9",
    reason: "ticket p1",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("PendingImpersonationApprovals", () => {
  it("sem pedidos pendentes não renderiza nada", () => {
    const { container } = render(<PendingImpersonationApprovals requests={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("aprovar e negar ficam desabilitados até digitar o motivo", async () => {
    render(<PendingImpersonationApprovals requests={[pedido()]} />);
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Negar" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Motivo da aprovação"), "aprovado para atender o ticket");
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Negar" })).toBeEnabled();
  });

  it("aprovar chama a ação com o id do pedido e o motivo digitado", async () => {
    approveImpersonationActionMock.mockResolvedValueOnce({ ok: true });
    render(<PendingImpersonationApprovals requests={[pedido()]} />);
    await userEvent.type(screen.getByLabelText("Motivo da aprovação"), "aprovado para atender o ticket");
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(approveImpersonationActionMock).toHaveBeenCalledWith("imp-2", "aprovado para atender o ticket");
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("negar chama a ação com o id do pedido e o motivo digitado", async () => {
    denyImpersonationActionMock.mockResolvedValueOnce({ ok: true });
    render(<PendingImpersonationApprovals requests={[pedido()]} />);
    await userEvent.type(screen.getByLabelText("Motivo da aprovação"), "sem justificativa suficiente");
    await userEvent.click(screen.getByRole("button", { name: "Negar" }));
    expect(denyImpersonationActionMock).toHaveBeenCalledWith("imp-2", "sem justificativa suficiente");
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("cada pedido tem seu próprio motivo — digitar num não afeta o outro", async () => {
    render(
      <PendingImpersonationApprovals
        requests={[pedido({ id: "imp-a", targetAccountId: "conta-a" }), pedido({ id: "imp-b", targetAccountId: "conta-b" })]}
      />,
    );
    const campos = screen.getAllByLabelText("Motivo da aprovação");
    await userEvent.type(campos[0]!, "motivo A");
    expect(screen.getAllByRole("button", { name: "Aprovar" })[1]).toBeDisabled();
  });
});
