import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { QrCodePrint } from "./qr-code-print";
import * as downloadFile from "@/features/admin/lib/download-file";
import * as qrPng from "@/features/admin/lib/qr-png";

vi.mock("@/features/admin/lib/download-file", () => ({
  downloadFromApi: vi.fn(),
  triggerBlobDownload: vi.fn(),
}));
vi.mock("@/features/admin/lib/qr-png", () => ({
  svgToPngBlob: vi.fn(),
}));

const props = {
  eventId: "evt-1",
  slug: "joana-e-pedro",
  eventName: "Joana & Pedro",
  guestUrl: "https://albora.app/e/joana-e-pedro",
  svgString: "<svg></svg>",
};

describe("QrCodePrint", () => {
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

  it("explica a entrada bloqueada em rascunho e leva à publicação", () => {
    render(<QrCodePrint {...props} isDraft />);
    expect(screen.getByText("Publique o evento antes de enviar o convite.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para publicação" })).toHaveAttribute("href", "/admin/e/evt-1#controle-publicar");
  });

  it("copia o mesmo endereço codificado no QR e informa sucesso", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<QrCodePrint {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(await screen.findByRole("button", { name: "Link copiado" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(props.guestUrl);
    expect(screen.getByLabelText("Link da página do convidado")).toHaveValue(props.guestUrl);
  });

  it("oferece cópia manual quando a área de transferência está bloqueada", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) } });
    render(<QrCodePrint {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("copie manualmente");
    expect(screen.getByLabelText("Link da página do convidado")).toHaveValue(props.guestUrl);
  });

  it("baixa o PNG rasterizando o SVG do QR no cliente", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    vi.mocked(qrPng.svgToPngBlob).mockResolvedValue(blob);

    render(<QrCodePrint {...props} />);
    fireEvent.click(screen.getByText("Baixar PNG"));

    await waitFor(() =>
      expect(downloadFile.triggerBlobDownload).toHaveBeenCalledWith(
        blob,
        "albora-joana-e-pedro-qrcode.png",
      ),
    );
    expect(qrPng.svgToPngBlob).toHaveBeenCalledWith("<svg></svg>");
  });

  it("baixa o PDF reaproveitando o endpoint de peças impressas com tokens", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    vi.mocked(downloadFile.downloadFromApi).mockResolvedValue(blob);

    render(<QrCodePrint {...props} />);
    fireEvent.click(screen.getByText("Baixar PDF"));

    await waitFor(() =>
      expect(downloadFile.downloadFromApi).toHaveBeenCalledWith(
        "/api/admin/events/evt-1/pieces?formato=placa-a4&tipo=pdf",
      ),
    );
    await waitFor(() =>
      expect(downloadFile.triggerBlobDownload).toHaveBeenCalledWith(
        blob,
        "albora-joana-e-pedro-placa-a4.pdf",
      ),
    );
  });

  it("mostra mensagem de erro quando a geração da peça falha, sem travar os botões", async () => {
    vi.mocked(downloadFile.downloadFromApi).mockRejectedValue(
      new Error("Título muito longo para a placa."),
    );

    render(<QrCodePrint {...props} />);
    fireEvent.click(screen.getByText("Baixar PDF"));

    expect(await screen.findByText("Título muito longo para a placa.")).toBeInTheDocument();
    expect(screen.getByText("Baixar PDF")).not.toBeDisabled();
  });
});
