import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImpersonationBanner } from "./impersonation-banner";

const { endImpersonationActionMock, refreshMock } = vi.hoisted(() => ({
  endImpersonationActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));
vi.mock("@/features/console/actions", () => ({ endImpersonationAction: endImpersonationActionMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

beforeEach(() => {
  endImpersonationActionMock.mockReset();
  refreshMock.mockReset();
});

describe("ImpersonationBanner", () => {
  it("sem sessão ativa não renderiza nada", () => {
    const { container } = render(<ImpersonationBanner active={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("com sessão ativa mostra o aviso, com o identificador da conta, sem botão de fechar — só de encerrar", () => {
    render(
      <ImpersonationBanner
        active={{ id: "imp-1", targetAccountId: "conta-1", expiresAt: new Date(Date.now() + 600_000) }}
      />,
    );
    expect(screen.getByText(/Você está vendo como/)).toBeInTheDocument();
    expect(screen.getByText(/conta-1/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fechar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encerrar sessão" })).toBeInTheDocument();
  });

  it("encerrar chama a ação com o id do pedido e recarrega a página", async () => {
    endImpersonationActionMock.mockResolvedValueOnce({ ok: true });
    render(
      <ImpersonationBanner
        active={{ id: "imp-1", targetAccountId: "conta-1", expiresAt: new Date(Date.now() + 600_000) }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Encerrar sessão" }));
    expect(endImpersonationActionMock).toHaveBeenCalledWith("imp-1");
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });
});
