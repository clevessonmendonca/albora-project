"use client";

import { useEffect, useState, type CSSProperties } from "react";
import QRCode from "qrcode";
import { cn } from "@albora/ui-web";
import { SHELL } from "../../lib/types";

/** Quem autoriza é quem já entrou na festa (convidado ou anfitrião com sessão) — não há tela de configurações do convidado. */
export function WallPairingScreen({
  variaveis,
  codigo,
}: {
  variaveis: Record<string, string>;
  codigo: string | null;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!codigo || typeof window === "undefined") {
      setQrDataUrl(null);
      return;
    }
    const url = `${window.location.origin}/wall-pair?codigo=${encodeURIComponent(codigo)}`;
    let cancelled = false;
    void QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 280,
    }).then((data) => {
      if (!cancelled) setQrDataUrl(data);
    });
    return () => {
      cancelled = true;
    };
  }, [codigo]);

  return (
    <main
      style={variaveis as CSSProperties}
      className={cn(SHELL, "bg-superficie-vignette grid place-items-center p-8")}
    >
      <style>{`
        @keyframes parede-pareamento-entra {
          from { opacity: 0; transform: translateY(0.75rem) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .parede-pareamento-entra { animation: parede-pareamento-entra var(--tempo-lento) var(--curva) both; }
        @media (prefers-reduced-motion: reduce) {
          .parede-pareamento-entra { animation: none !important; }
        }
      `}</style>

      <div className="parede-pareamento-entra grid w-full max-w-[75rem] items-center gap-[clamp(2rem,5vw,4.5rem)] text-center md:grid-cols-[1.3fr_auto] md:text-left">
        <div>
          <p className="tipo-label m-0 uppercase tracking-rotulo text-ink-2">Para ligar o telão</p>

          <p className="tipo-body m-0 mb-2 mt-6 text-[clamp(0.95rem,1.6vw,1.2rem)] text-ink-3">
            1. Abra a festa no celular
          </p>
          <p
            aria-live="polite"
            className="tipo-display m-0 font-titulo text-[clamp(4rem,13vw,8.5rem)] font-normal leading-none tracking-[0.14em] text-acento tabular-nums"
          >
            {codigo ?? "······"}
          </p>
          <p className="tipo-body m-0 mt-6 text-[clamp(0.95rem,1.6vw,1.2rem)] text-ink-3">
            2. Autorize este código · 3. Pronto
          </p>
        </div>

        <div className="grid justify-items-center gap-4 md:justify-items-start">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR para autorizar o telão"
              className="size-[min(15rem,44vw)] rounded-superficie bg-bg p-3.5 shadow-alta"
            />
          ) : (
            <div
              aria-hidden
              className="size-[min(15rem,44vw)] rounded-superficie bg-bg shadow-alta"
            />
          )}
          <p className="tipo-body m-0 max-w-[26ch] text-[clamp(0.9rem,1.5vw,1.1rem)] leading-relaxed text-ink-2">
            Ou escaneie o QR ao lado. Vale para qualquer pessoa que já entrou no evento.
          </p>
        </div>
      </div>
    </main>
  );
}
