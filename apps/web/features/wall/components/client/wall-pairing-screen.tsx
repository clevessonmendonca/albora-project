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
      <div className="max-w-[40ch] text-center">
        <p className="m-0 text-[clamp(0.95rem,1.8vw,1.25rem)] uppercase tracking-rotulo text-ink-2">
          Para ligar o telão
        </p>
        
        <div className="my-8">
          <p className="m-0 mb-3 text-[0.95rem] text-ink-3">
            1. Abra a festa no celular
          </p>
          <p className="my-8 font-titulo text-[clamp(3.5rem,14vw,9rem)] font-light leading-none tracking-[0.18em] text-acento tabular-nums">
            {codigo ?? "······"}
          </p>
          <p className="m-0 mt-3 text-[0.95rem] text-ink-3">
            2. Autorize este código · 3. Pronto
          </p>
        </div>

        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR para autorizar o telão"
            className="mx-auto mb-7 size-[min(13rem,42vw)] rounded-token bg-bg p-2.5 shadow-suave"
          />
        ) : null}
        
        <p className="m-0 max-w-[36ch] text-[clamp(0.95rem,1.8vw,1.25rem)] leading-relaxed text-ink-2">
          Ou escaneie o QR acima para autorizar. Vale para qualquer pessoa que já entrou no evento.
        </p>
      </div>
    </main>
  );
}
