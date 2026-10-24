import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MenuDaConta } from "./menu-da-conta";

async function abrirConfirmacao() {
  render(<MenuDaConta email="ana@exemplo.com" />);
  await userEvent.click(screen.getByRole("button", { name: "Conta e configurações" }));
  await userEvent.click(screen.getByRole("button", { name: "Sair desta conta" }));
}

describe("MenuDaConta: sair", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("quando o servidor não confirma, avisa e mantém a confirmação aberta", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    await abrirConfirmacao();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("a sessão continua aberta"));
    expect(screen.getByRole("button", { name: "Sair" })).not.toBeDisabled();
  });

  it("quando a rede cai, também avisa", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    await abrirConfirmacao();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
