import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReauthForm } from "./reauth-form";

vi.mock("@/features/console/actions", () => ({
  requestReauthAction: vi.fn().mockResolvedValue({ sent: true }),
  completeReauthAction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("ReauthForm", () => {
  it("sem token pede confirmação e envia o link ao clicar", async () => {
    render(<ReauthForm magic={null} next="/console/accounts/x" />);
    expect(screen.getByRole("heading", { name: "Confirmar que é você" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar link de confirmação" }));
    expect(await screen.findByText(/o link já está a caminho/i)).toBeInTheDocument();
  });

  it("com token confirma e redireciona para next", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<ReauthForm magic="tok123" next="/console/accounts/x" />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(assign).toHaveBeenCalledWith("/console/accounts/x");
  });
});
