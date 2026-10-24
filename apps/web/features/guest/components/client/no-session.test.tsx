import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoSession } from "./no-session";

vi.mock("@albora/ui-web", () => ({
  GuestShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EntryColumn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FinePrint: ({ children }: { children: React.ReactNode }) => <small>{children}</small>,
}));

const pathname = vi.hoisted(() => ({ valor: null as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.valor }));

describe("NoSession", () => {
  beforeEach(() => {
    pathname.valor = null;
  });

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

  it("leva a página de origem como next para a entrada devolver o convidado ao destino", () => {
    pathname.valor = "/e/meu-evento/feed";
    render(<NoSession slug="meu-evento" />);
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/e/meu-evento?next=%2Fe%2Fmeu-evento%2Ffeed",
    );
  });

  it("não repassa next quando a origem é a própria cover", () => {
    pathname.valor = "/e/meu-evento/cover";
    render(<NoSession slug="meu-evento" />);
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/e/meu-evento");
  });
});
