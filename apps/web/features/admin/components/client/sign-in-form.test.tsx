import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { safeAdminNext, SignInForm } from "./sign-in-form";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe("safeAdminNext", () => {
  it("aceita só paths /admin", () => {
    expect(safeAdminNext("/admin/new?plano=celebration")).toBe("/admin/new?plano=celebration");
    expect(safeAdminNext("/admin")).toBe("/admin");
  });

  it("recusa open redirect", () => {
    expect(safeAdminNext("https://evil.com")).toBeNull();
    expect(safeAdminNext("//evil.com")).toBeNull();
    expect(safeAdminNext("/e/festa")).toBeNull();
    expect(safeAdminNext(null)).toBeNull();
  });
});

describe("SignInForm", () => {
  it("mostra o botão 'Entrar com Google' apontando para /auth/google/start?surface=host", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<SignInForm magic={null} />);

    await userEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
    expect(assign).toHaveBeenCalledWith("/auth/google/start?surface=host");
  });
});
