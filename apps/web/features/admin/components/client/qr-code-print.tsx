"use client";

import React, { useState } from "react";
import { botaoDoPainel, Cartao } from "@/features/admin/components/server/kit-do-painel";
import { EventLink } from "@/features/admin/components/client/event-link";
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
          [data-admin-nav], #sidebar-do-painel,
          [data-admin-shell-header], [data-admin-shell-back] { display: none !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .qr-print-area { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <Cartao className="qr-print-area">
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">
            Seu QR
          </div>
          <p className="m-0 font-[family-name:var(--fonte-titulo)] text-[1.375rem] text-ink">
            {eventName}
          </p>

          <div
            className="w-56 rounded-[17px] bg-superficie-alta p-3 shadow-suave"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />

          <p className="m-0 max-w-xs text-[13px] text-ink-3">
            Aponte a câmera do celular para o QR e comece a enviar fotos.
          </p>

          <div className="w-full max-w-xs">
            <EventLink title="Link do convite" url={guestUrl} />
          </div>
        </div>
      </Cartao>

      <div className="print:hidden mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className={botaoDoPainel({ variant: "primary" })}
        >
          Imprimir
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDownloadPng()}
          className={`${botaoDoPainel({ variant: "light" })} ${busy ? "cursor-wait opacity-60" : ""}`}
        >
          {downloading === "png" ? "Gerando…" : "Baixar PNG"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDownloadPdf()}
          className={`${botaoDoPainel({ variant: "light" })} ${busy ? "cursor-wait opacity-60" : ""}`}
        >
          {downloading === "pdf" ? "Gerando…" : "Baixar PDF"}
        </button>
      </div>

      {error && (
        <div role="alert" className="print:hidden mt-4 flex justify-center">
          <p className="max-w-xs rounded-[9px] border border-critico bg-superficie px-4 py-3 text-center text-[13px] text-critico">
            {error}
          </p>
        </div>
      )}
    </>
  );
}
