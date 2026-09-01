import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoSession } from "./no-session";

vi.mock("@albora/ui-web", () => ({
  GuestShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EntryColumn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FinePrint: ({ children }: { children: React.ReactNode }) => <small>{children}</small>,
}));

describe("NoSession", () => {
  it("renders the heading", () => {
    render(<NoSession slug="meu-evento" />);
    expect(screen.getByRole("heading", { name: "Falta você entrar" })).toBeDefined();
  });

  it("renders entry link pointing to /e/{slug}", () => {
    render(<NoSession slug="meu-evento" />);
    const link = screen.getByRole("link", { name: "Entrar" });
    expect(link).toHaveAttribute("href", "/e/meu-evento");
  });

  it("encodes special characters in the slug", () => {
    render(<NoSession slug="festa & alegria" />);
    const link = screen.getByRole("link", { name: "Entrar" });
    expect(link).toHaveAttribute("href", "/e/festa%20%26%20alegria");
  });
});
