"use client";

import React, { useEffect, useState } from "react";
import { eventEntryUrl } from "@/lib/qr";
import { CopiarLinkEvento } from "@/features/admin/components/client/copiar-link-evento";
import { buttonVariants } from "@albora/ui-web";

export function ConviteCard({ slug, eventId, origin }: { slug: string; eventId: string; origin: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!origin) return;
    let ativo = true;
    void import("qrcode")
      .then((m) => m.toDataURL(eventEntryUrl(origin, slug, "qr"), { errorCorrectionLevel: "M", margin: 2, width: 320 }))
      .then((url) => ativo && setQr(url))
      .catch(() => ativo && setQr(null));
    return () => {
      ativo = false;
    };
  }, [origin, slug]);

  const link = origin ? `${origin.replace(/^https?:\/\//, "")}/e/${slug}` : `/e/${slug}`;

  return (
    <section
      aria-label="Convite do evento"
      className="anima-surge flex flex-col items-center gap-4 rounded-[var(--raio-superficie,18px)] border border-linha bg-surface p-5 text-center sm:flex-row sm:text-left"
      style={{ animationDelay: "120ms" }}
    >
      <div className="flex size-36 shrink-0 items-center justify-center rounded-xl border border-linha bg-bg">
        {qr ? (
          <img src={qr} alt="QR Code que abre o evento no celular do convidado" width={128} height={128} />
        ) : (
          <span className="tipo-caption text-ink-3">Gerando QR…</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="tipo-label m-0 uppercase tracking-[0.18em] text-ink-3">Um link, muitos olhares</p>
        <p className="tipo-body m-0 text-ink-2">
          Envie antes da festa ou deixe o QR à vista no grande dia. Ninguém precisa baixar nada.
        </p>
        <p className="tipo-caption m-0 truncate text-ink">{link}</p>
        <div className="flex flex-wrap gap-2">
          <CopiarLinkEvento slug={slug} />
          <a href={`/admin/e/${eventId}/qrcode`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Baixar placa com QR
          </a>
        </div>
      </div>
    </section>
  );
}
