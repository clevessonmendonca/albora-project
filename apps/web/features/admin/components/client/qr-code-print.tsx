"use client";

import React, { useState } from "react";
import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";
import { downloadFromApi, triggerBlobDownload } from "@/features/admin/lib/download-file";
import { svgToPngBlob } from "@/features/admin/lib/qr-png";

type Props = {
  eventId: string;
  slug: string;
  eventName: string;
  guestUrl: string;
  svgString: string;
};

type Downloading = "png" | "pdf" | null;

export function QrCodePrint({ eventId, slug, eventName, guestUrl, svgString }: Props) {
  const [downloading, setDownloading] = useState<Downloading>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPng = async () => {
    setError(null);
    setDownloading("png");
    try {
      const blob = await svgToPngBlob(svgString);
      triggerBlobDownload(blob, `albora-${slug}-qrcode.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não baixou agora.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    setError(null);
    setDownloading("pdf");
    try {
      const blob = await downloadFromApi(
        `/api/admin/events/${eventId}/pieces?formato=placa-a4&tipo=pdf`,
      );
      triggerBlobDownload(blob, `albora-${slug}-placa-a4.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não baixou agora.");
    } finally {
      setDownloading(null);
    }
  };

  const busy = downloading !== null;

  return (
    <>
      <style>{`
        @media print {
          header, nav, aside, footer,
          [data-admin-nav], [data-admin-shell-header],
          [data-admin-shell-back] { display: none !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .qr-print-area { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <AdminCard className="qr-print-area">
        <div className="flex flex-col items-center gap-6 py-4">
          <div
            className="w-56 rounded-token bg-white p-3 shadow-suave"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />

          <div className="text-center">
            <p className="tipo-subtitle mb-1 mt-0 text-ink">{eventName}</p>
            <p className="tipo-caption mb-0 mt-0 break-all font-mono text-ink-2">{guestUrl}</p>
          </div>

          <p className="tipo-caption mb-0 mt-0 max-w-xs text-center text-ink-3">
            Aponte a câmera do celular para o QR Code e comece a enviar fotos.
          </p>
        </div>
      </AdminCard>

      <div className="print:hidden mt-2 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className={adminClasses.primaryButton}
        >
          Imprimir
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDownloadPng()}
          className={`${adminClasses.secondaryButton} ${busy ? "cursor-wait opacity-60" : ""}`}
        >
          {downloading === "png" ? "Gerando…" : "Baixar PNG"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDownloadPdf()}
          className={`${adminClasses.secondaryButton} ${busy ? "cursor-wait opacity-60" : ""}`}
        >
          {downloading === "pdf" ? "Gerando…" : "Baixar PDF"}
        </button>
      </div>

      {error && (
        <div role="alert" className="print:hidden mt-4 flex justify-center">
          <p className="tipo-caption m-0 max-w-xs rounded-token border border-critico bg-superficie px-4 py-3 text-center text-critico">
            {error}
          </p>
        </div>
      )}
    </>
  );
}
