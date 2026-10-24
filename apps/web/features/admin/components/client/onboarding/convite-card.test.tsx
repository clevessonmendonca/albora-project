import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const QR_DATA_URL = "data:image/png;base64,QR";
const toDataURL = vi.hoisted(() => vi.fn());

vi.mock("qrcode", () => ({ toDataURL }));

import { ConviteCard } from "./convite-card";

function adiarQr() {
  let resolver!: (url: string) => void;
  let avisar!: () => void;
  const pronto = new Promise<string>((resolve) => {
    resolver = resolve;
  });
  const chamado = new Promise<void>((resolve) => {
    avisar = resolve;
  });
  toDataURL.mockImplementation(() => {
    avisar();
    return pronto;
  });
  return async (url: string) => {
    await act(async () => {
      await chamado;
      resolver(url);
      await pronto;
    });
  };
}

describe("ConviteCard", () => {
  beforeEach(() => {
    toDataURL.mockReset();
  });

  it("gera o QR do link do evento e mostra o link sem protocolo", async () => {
    const resolverQr = adiarQr();
    render(<ConviteCard slug="clevesson-e-miria" eventId="evento-1" origin="https://albora.test" />);

    expect(screen.getByText("albora.test/e/clevesson-e-miria")).toBeInTheDocument();
    expect(screen.getByText("Gerando QR…")).toBeInTheDocument();
    await resolverQr(QR_DATA_URL);

    const qr = screen.getByAltText(/QR Code que abre o evento/);
    expect(qr.getAttribute("src")).toBe(QR_DATA_URL);
    expect(toDataURL).toHaveBeenCalledWith(
      expect.stringContaining("albora.test/e/clevesson-e-miria"),
      expect.objectContaining({ errorCorrectionLevel: "M", width: 320 }),
    );
    expect(screen.getByRole("link", { name: "Baixar placa com QR" })).toHaveAttribute("href", "/admin/e/evento-1/qrcode");
  });

  it("sem origem ainda, não gera QR e mostra o estado de espera", () => {
    render(<ConviteCard slug="x" eventId="e" origin="" />);
    expect(screen.getByText("Gerando QR…")).toBeInTheDocument();
    expect(toDataURL).not.toHaveBeenCalled();
  });
});
