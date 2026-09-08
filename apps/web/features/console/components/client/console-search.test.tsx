import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsoleSearch } from "./console-search";

const { searchConsoleActionMock, pushMock } = vi.hoisted(() => ({
  searchConsoleActionMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/features/console/actions", () => ({ searchConsoleAction: searchConsoleActionMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

describe("ConsoleSearch", () => {
  it("⌘K abre a paleta, alcançável por teclado", async () => {
    render(<ConsoleSearch />);
    expect(screen.queryByLabelText("Buscar conta, evento ou ticket")).not.toBeInTheDocument();
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByLabelText("Buscar conta, evento ou ticket")).toBeInTheDocument();
  });

  it("digitar dispara a busca e selecionar um resultado navega e fecha a paleta", async () => {
    searchConsoleActionMock.mockResolvedValueOnce([
      { kind: "account", id: "conta-1", label: "j••••@gmail.com", href: "/console/accounts/conta-1" },
    ]);
    render(<ConsoleSearch />);
    await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));
    await userEvent.type(screen.getByLabelText("Buscar conta, evento ou ticket"), "jo");

    const resultado = await screen.findByText("j••••@gmail.com");
    await userEvent.click(resultado);

    expect(pushMock).toHaveBeenCalledWith("/console/accounts/conta-1");
    expect(screen.queryByLabelText("Buscar conta, evento ou ticket")).not.toBeInTheDocument();
  });

  it("Esc fecha a paleta e devolve o foco pro botão que abriu", async () => {
    render(<ConsoleSearch />);
    const botao = screen.getByRole("button", { name: /Buscar/ });
    await userEvent.click(botao);
    expect(await screen.findByLabelText("Buscar conta, evento ou ticket")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByLabelText("Buscar conta, evento ou ticket")).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });
});
