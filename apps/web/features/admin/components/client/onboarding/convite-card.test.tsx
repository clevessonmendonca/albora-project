import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConviteCard } from "./convite-card";

describe("ConviteCard", () => {
  it("gera o QR do link do evento e mostra o link sem protocolo", async () => {
    render(<ConviteCard slug="clevesson-e-miria" eventId="evento-1" origin="https://albora.test" />);
    expect(screen.getByText("albora.test/e/clevesson-e-miria")).toBeInTheDocument();
    const qr = await screen.findByAltText(/QR Code que abre o evento/);
    await waitFor(() => expect(qr.getAttribute("src")).toMatch(/^data:image\/png;base64,/));
    expect(screen.getByRole("link", { name: "Baixar placa com QR" })).toHaveAttribute("href", "/admin/e/evento-1/qrcode");
  });

  it("sem origem ainda, não gera QR e mostra o estado de espera", () => {
    render(<ConviteCard slug="x" eventId="e" origin="" />);
    expect(screen.getByText("Gerando QR…")).toBeInTheDocument();
  });
});
