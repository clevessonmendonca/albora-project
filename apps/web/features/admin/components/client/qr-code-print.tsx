"use client";

import React, { useState } from "react";
import { CAPA_FOCO_PADRAO, capaObjectPosition, type CapaFoco } from "@albora/core";
import Link from "next/link";
import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";
import { downloadFromApi, triggerBlobDownload } from "@/features/admin/lib/download-file";
import { svgToPngBlob } from "@/features/admin/lib/qr-png";
import { marcarPreparo } from "@/features/admin/lib/marcar-preparo";
import { VerComoConvidado } from "./home/acoes";

type Props = {
  eventId: string;
  slug: string;
  eventName: string;
  guestUrl: string;
  svgString: string;
  coverImageUrl?: string;
  coverFoco?: CapaFoco;
  coverFocoX?: CapaFoco;
  dateLabel?: string;
  isDraft?: boolean;
};

type Downloading = "png" | "pdf" | null;

export function QrCodePrint({
  eventId,
  slug,
  eventName,
  guestUrl,
  svgString,
  coverImageUrl,
  coverFoco = CAPA_FOCO_PADRAO,
  coverFocoX = CAPA_FOCO_PADRAO,
  dateLabel,
  isDraft = false,
}: Props) {
  const [downloading, setDownloading] = useState<Downloading>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Não foi possível copiar. Selecione o link abaixo e copie manualmente.");
    }
  };

  const handleDownloadPng = async () => {
    setError(null);
    setDownloading("png");
    try {
      const blob = await svgToPngBlob(svgString);
      triggerBlobDownload(blob, `albora-${slug}-qrcode.png`);
      // Baixar é o que torna o QR realmente preparado — abrir a página não é.
      marcarPreparo(eventId, "qr");
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
      marcarPreparo(eventId, "qr");
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

      <div className="print:hidden mb-7 max-w-2xl">
        <h2 className="m-0 font-titulo text-[clamp(2rem,4vw,3rem)] font-light leading-tight text-balance">
          Um convite. Todos os olhares.
        </h2>
        <p className="tipo-body mt-3 mb-0 text-ink-2">
          Envie o link antes da festa ou deixe o QR à vista para receber as fotos de quem está com vocês.
        </p>
      </div>

      {isDraft && (
        <div className="print:hidden mb-6 rounded-superficie border border-linha bg-superficie-alta p-5">
          <p className="m-0 font-medium">Publique o evento antes de enviar o convite.</p>
          <p className="mt-2 text-sm text-ink-2">
            Você já pode preparar o QR e a impressão. Seus convidados só conseguem entrar depois da publicação.
          </p>
          <Link
            href={`/admin/e/${eventId}#controle-publicar`}
            className={adminClasses.secondaryButton}
          >
            Ir para publicação
          </Link>
        </div>
      )}

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] print:block">
        <AdminCard className="qr-print-area min-w-0">
        <div className="flex flex-col items-center gap-6 py-4">
          <h2 className="m-0 max-w-full break-words text-center font-titulo text-[clamp(1.75rem,3vw,2.5rem)] font-light">
            {eventName}
          </h2>
          <div
            role="img"
            aria-label={`QR Code para entrar em ${eventName}`}
            className="w-full max-w-64 rounded-token bg-white p-3 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />

          <div className="text-center">
            <p className="tipo-caption mb-0 mt-0 break-all font-mono text-ink-2">{guestUrl}</p>
          </div>

          <p className="tipo-caption mb-0 mt-0 max-w-xs text-center text-ink-3">
            Aponte a câmera do celular para o QR Code e comece a enviar fotos.
          </p>
        </div>
      <div className="print:hidden mt-6 border-t border-linha pt-6">
        <label htmlFor="guest-invite-url" className="mb-2 block text-sm font-medium">
          Link da página do convidado
        </label>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <input
            id="guest-invite-url"
            readOnly
            value={guestUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-12 min-w-0 flex-1 rounded-token border border-linha bg-bg px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento-texto"
          />
          <button
            type="button"
            onClick={() => void copyLink()}
            className={`${adminClasses.primaryButton} min-h-12 shrink-0`}
          >
            {copied ? "Link copiado" : "Copiar link"}
          </button>
        </div>
        <p role="status" className="mt-2 min-h-5 text-sm text-ink-2">
          {copied
            ? "Link copiado."
            : isDraft
              ? "Publique o evento para liberar a entrada pelo link."
              : "O mesmo link funciona antes e durante o evento."}
        </p>
        <VerComoConvidado eventId={eventId} slug={slug} rotulo="Testar como convidado" />
      </div>
        </AdminCard>

      <aside className="print:hidden grid min-w-0 gap-6" aria-label="Convite e impressão">
        {coverImageUrl && (
          <figure className="m-0 overflow-hidden rounded-superficie border border-linha bg-superficie">
            <img
              src={coverImageUrl}
              alt="Capa do evento"
              style={{ objectPosition: capaObjectPosition(coverFoco, coverFocoX) }}
              className="aspect-[4/3] w-full object-cover"
            />
            <figcaption className="p-6 text-center">
              <p className="m-0 break-words font-titulo text-2xl font-light">{eventName}</p>
              {dateLabel && <p className="mt-3 text-sm text-ink-2">{dateLabel}</p>}
              <p className="mt-4 mb-0 text-sm leading-relaxed text-ink-2">
                As melhores memórias são feitas juntos.<br />Registre a sua com a gente.
              </p>
            </figcaption>
          </figure>
        )}
        <section
          className="min-w-0 rounded-superficie border border-linha p-6"
          aria-labelledby="print-invite-heading"
        >
          <h2 id="print-invite-heading" className="m-0 font-titulo text-2xl font-light">
            Leve o convite para a festa
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Use o PNG em uma arte ou baixe a placa em PDF para imprimir. Coloque o QR nas mesas ou na entrada.
          </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className={adminClasses.secondaryButton}
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
        </section>
      </aside>
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
