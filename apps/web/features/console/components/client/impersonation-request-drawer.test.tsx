import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImpersonationRequestDrawer } from "./impersonation-request-drawer";

const { requestImpersonationActionMock, startImpersonationActionMock, refreshMock } = vi.hoisted(() => ({
  requestImpersonationActionMock: vi.fn(),
  startImpersonationActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));
vi.mock("@/features/console/actions", () => ({
  requestImpersonationAction: requestImpersonationActionMock,
  startImpersonationAction: startImpersonationActionMock,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

beforeEach(() => {
  requestImpersonationActionMock.mockReset();
  startImpersonationActionMock.mockReset();
  refreshMock.mockReset();
});

describe("ImpersonationRequestDrawer", () => {
  it("sem pedido em andamento, exige motivo antes de habilitar enviar, e mostra 'aguardando aprovação' depois", async () => {
    requestImpersonationActionMock.mockResolvedValueOnce({ ok: true });
    render(<ImpersonationRequestDrawer accountId="conta-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Ver como" }));
    const enviar = screen.getByRole("button", { name: "Enviar pedido" });
    expect(enviar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Motivo"), "cliente pediu ajuda visual");
    expect(enviar).toBeEnabled();

    await userEvent.click(enviar);
    expect(requestImpersonationActionMock).toHaveBeenCalledWith("conta-1", "cliente pediu ajuda visual");
    expect(await screen.findByText(/aguardando aprovação/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver como" })).not.toBeInTheDocument();
  });

  it("erro do pedido aparece sem travar o formulário", async () => {
    requestImpersonationActionMock.mockResolvedValueOnce({ ok: false, error: "ator sem a capacidade impersonate.request" });
    render(<ImpersonationRequestDrawer accountId="conta-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Ver como" }));
    await userEvent.type(screen.getByLabelText("Motivo"), "ticket p1");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pedido" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ator sem a capacidade");
  });

  it("pedido pending mostra 'aguardando aprovação' sem o botão de ver como", () => {
    render(
      <ImpersonationRequestDrawer
        accountId="conta-1"
        existingRequest={{ id: "imp-1", status: "pending", expiresAt: null }}
      />,
    );
    expect(screen.getByText(/aguardando aprovação/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver como" })).not.toBeInTheDocument();
  });

  it("pedido aprovado e ainda válido mostra o botão de iniciar, que chama a ação com o id do pedido", async () => {
    startImpersonationActionMock.mockResolvedValueOnce({ ok: true });
    render(
      <ImpersonationRequestDrawer
        accountId="conta-1"
        existingRequest={{ id: "imp-9", status: "approved", expiresAt: new Date(Date.now() + 600_000) }}
      />,
    );
    const botaoIniciar = screen.getByRole("button", { name: "Iniciar sessão" });
    expect(botaoIniciar).toBeInTheDocument();

    await userEvent.click(botaoIniciar);
    expect(startImpersonationActionMock).toHaveBeenCalledWith("imp-9");
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("pedido aprovado mas expirado aparece como expirado, e o botão de iniciar não fica disponível", () => {
    render(
      <ImpersonationRequestDrawer
        accountId="conta-1"
        existingRequest={{ id: "imp-9", status: "approved", expiresAt: new Date(Date.now() - 60_000) }}
      />,
    );
    expect(screen.getByText(/expirado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar sessão" })).not.toBeInTheDocument();
  });

  it("pedido expirado ainda permite pedir de novo", async () => {
    render(
      <ImpersonationRequestDrawer
        accountId="conta-1"
        existingRequest={{ id: "imp-9", status: "approved", expiresAt: new Date(Date.now() - 60_000) }}
      />,
    );
    expect(screen.getByRole("button", { name: "Pedir novamente" })).toBeInTheDocument();
  });

  it("sessão já ativa não mostra nem o botão de ver como nem o de iniciar", () => {
    render(
      <ImpersonationRequestDrawer
        accountId="conta-1"
        existingRequest={{ id: "imp-9", status: "active", expiresAt: new Date(Date.now() + 600_000) }}
      />,
    );
    expect(screen.getByText(/sessão ativa/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver como" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar sessão" })).not.toBeInTheDocument();
  });

  it("pedido encerrado (ended) volta a mostrar o botão de ver como", () => {
    render(
      <ImpersonationRequestDrawer
        accountId="conta-1"
        existingRequest={{ id: "imp-9", status: "ended", expiresAt: new Date(Date.now() - 600_000) }}
      />,
    );
    expect(screen.getByRole("button", { name: "Ver como" })).toBeInTheDocument();
  });
});
