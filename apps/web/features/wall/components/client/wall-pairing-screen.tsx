"use client";

import { useEffect, useState, type CSSProperties } from "react";
import QRCode from "qrcode";
import { cn } from "@albora/ui-web";
import { SHELL } from "../../lib/types";

/**
 * A TV mostra o código e um QR para `/wall-pair?codigo=`.
 * Quem já entrou na festa (convidado ou anfitrião com sessão) autoriza —
 * não existe tela de "configurações" do convidado.
 */
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
      className={cn(SHELL, "grid place-items-center p-8")}
    >
      <div className="max-w-[36ch] text-center">
        <p className="m-0 text-[clamp(1rem,2vw,1.5rem)] uppercase tracking-rotulo text-ink-2">
          Para ligar o telão
        </p>
        <p className="my-6 font-titulo text-[clamp(3rem,12vw,8rem)] tracking-[0.15em] text-acento tabular-nums">
          {codigo ?? "······"}
        </p>
        {qrDataUrl ? (
          // QR alto contraste: identidade não pinta o código (N1.1).
          <img
            src={qrDataUrl}
            alt="QR para autorizar o telão"
            className="mx-auto mb-6 size-[min(12rem,40vw)] rounded-token bg-bg p-2"
          />
        ) : null}
        <p className="m-0 text-[clamp(0.95rem,1.8vw,1.35rem)] leading-normal text-ink-2">
          No celular, abra o QR da festa e autorize este código — ou escaneie o
          QR acima. Vale para quem já entrou no evento.
        </p>
      </div>
    </main>
  );
}
