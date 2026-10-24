import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScanPage } from "./scan-page";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

class DetectorFalso {
  static getSupportedFormats = async () => ["qr_code"];
  detect = async () => [];
}

describe("ScanPage", () => {
  beforeEach(() => {
    vi.stubGlobal("BarcodeDetector", DetectorFalso);
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("câmera negada diz o motivo e cai no campo de código", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error("NotAllowedError")) },
    });
    render(<ScanPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Escanear o QR" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Não deu para abrir a câmera"));
    expect(screen.getByLabelText("Código ou link da festa")).toBeTruthy();
  });

  it("Cancelar volta ao campo de código com a opção de escanear de novo", async () => {
    const parar = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: parar }] }) },
    });
    render(<ScanPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Escanear o QR" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Código ou link da festa")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escanear o QR" })).toBeTruthy();
  });
});
