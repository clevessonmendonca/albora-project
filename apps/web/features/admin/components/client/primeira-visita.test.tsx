import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrimeiraVisita } from "./primeira-visita";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrimeiraVisita", () => {
  it("aparece para quem nunca dispensou", () => {
    render(<PrimeiraVisita />);

    expect(screen.getByRole("button", { name: /entendi/i })).toBeInTheDocument();
  });

  it("não é modal: quem ignorar continua trabalhando", () => {
    render(<PrimeiraVisita />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("sai com um toque", async () => {
    const user = userEvent.setup();
    render(<PrimeiraVisita />);

    await user.click(screen.getByRole("button", { name: /entendi/i }));

    expect(screen.queryByRole("button", { name: /entendi/i })).not.toBeInTheDocument();
  });

  it("dispensada, não volta", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PrimeiraVisita />);
    await user.click(screen.getByRole("button", { name: /entendi/i }));
    unmount();

    render(<PrimeiraVisita />);

    expect(screen.queryByRole("button", { name: /entendi/i })).not.toBeInTheDocument();
  });

  it("sem localStorage a tela não quebra: aparece, só não persiste", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("modo privado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("modo privado");
    });
    const user = userEvent.setup();

    render(<PrimeiraVisita />);
    expect(screen.getByRole("button", { name: /entendi/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /entendi/i }));
    expect(screen.queryByRole("button", { name: /entendi/i })).not.toBeInTheDocument();
  });
});
