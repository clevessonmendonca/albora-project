import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RevealPiiButton } from "./reveal-pii-button";

const { revealAccountPiiActionMock } = vi.hoisted(() => ({ revealAccountPiiActionMock: vi.fn() }));
vi.mock("@/features/console/actions", () => ({ revealAccountPiiAction: revealAccountPiiActionMock }));

describe("RevealPiiButton", () => {
  it("exige motivo antes de mostrar o e-mail revelado", async () => {
    revealAccountPiiActionMock.mockResolvedValueOnce({ ok: true, email: "titular@exemplo.test" });
    render(<RevealPiiButton accountId="conta-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Revelar contato" }));
    await userEvent.type(screen.getByLabelText("Motivo"), "ticket #7");
    await userEvent.click(screen.getByRole("button", { name: "Revelar" }));

    expect(await screen.findByText("titular@exemplo.test")).toBeInTheDocument();
    expect(revealAccountPiiActionMock).toHaveBeenCalledWith("conta-1", "ticket #7");
  });

  it("erro de autorização aparece sem revelar nada", async () => {
    revealAccountPiiActionMock.mockResolvedValueOnce({ ok: false, error: "ator sem a capacidade accounts.pii.reveal" });
    render(<RevealPiiButton accountId="conta-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Revelar contato" }));
    await userEvent.click(screen.getByRole("button", { name: "Revelar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ator sem a capacidade");
  });
});
