import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

vi.mock("@/features/console/actions", () => ({
  requestLoginAction: vi.fn().mockResolvedValue({ sent: true }),
  completeLoginAction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("LoginForm", () => {
  it("mostra o botão 'Entrar com Google' apontando para /auth/google/start?surface=staff", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<LoginForm magic={null} />);

    await userEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
    expect(assign).toHaveBeenCalledWith("/auth/google/start?surface=staff");
  });
});
