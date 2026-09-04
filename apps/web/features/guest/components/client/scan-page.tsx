"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GuestShell, SkipLink } from "@albora/ui-web";
import { useScanQr } from "@/features/guest/hooks/scan-qr";

export function ScanPage() {
  const qr = useScanQr();
  const { podeEscanear, setEscaneando } = qr;
  const [showLinkForm, setShowLinkForm] = useState(!podeEscanear);

  useEffect(() => {
    if (podeEscanear && !showLinkForm) {
      setEscaneando(true);
    }
  }, [podeEscanear, showLinkForm, setEscaneando]);

  return (
    <GuestShell hideStatusBar>
      <SkipLink href="#scan-visor" />
      <div className="flex min-h-dvh flex-1 flex-col">
        <div className="flex justify-end px-[1.125rem] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            className="tipo-label uppercase text-ink-3 no-underline transition-[opacity,transform] duration-instantaneo ease-mola hover:opacity-70 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Início
          </Link>
        </div>
        {!showLinkForm && (
          <div id="scan-visor" className="relative min-h-0 flex-1 bg-superficie">
            {qr.escaneando && (
              <>
                <video
                  ref={qr.visor}
                  muted
                  playsInline
                  aria-label="Câmera apontada para o QR"
                  className="block size-full object-cover"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-[18%] rounded-token border border-acento shadow-scan-mascara"
                />
                <p className="tipo-subtitle absolute left-[1.125rem] right-[1.125rem] top-[max(1rem,env(safe-area-inset-top))] m-0 text-center text-ink [text-shadow:0_1px_4px_var(--bg)]">
                  Aponte para o QR da festa
                </p>
              </>
            )}
          </div>
        )}

        <div className="grid flex-none gap-3 px-[1.125rem] pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
          {showLinkForm ? (
            <form onSubmit={qr.enviarCodigo} className="grid gap-3">
              <p className="tipo-label m-0 uppercase text-ink-3">Código da mesa</p>
              <input
                ref={qr.campo}
                value={qr.codigo}
                onChange={(e) => {
                  qr.setCodigo(e.target.value);
                  qr.setNaoEntendi(false);
                }}
                placeholder="o código impresso ou o link"
                maxLength={120}
                required
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-label="Código ou link da festa"
                className="min-h-[52px] w-full rounded-pilula border border-linha bg-bg px-3.5 text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
              />
              <button
                type="submit"
                disabled={qr.codigo.trim().length === 0}
                className="min-h-[52px] cursor-pointer rounded-pilula border-none bg-acento font-[inherit] font-semibold text-sobre-acento shadow-suave transition-[transform,opacity] duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.97] disabled:cursor-default disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Entrar
              </button>
              {qr.naoEntendi && (
                <p role="alert" className="m-0 tipo-caption text-critico">
                  Esse código não abre nenhum evento. Confere de novo? Às vezes é só um zero no lugar do O.
                </p>
              )}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowLinkForm(true)}
              className="min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent font-[inherit] text-ink-2 transition-[color,border-color,transform] duration-instantaneo ease-mola hover:border-acento-texto active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Já tenho o link
            </button>
          )}

          {showLinkForm && qr.podeEscanear && (
            <button
              type="button"
              onClick={() => {
                setShowLinkForm(false);
                qr.setEscaneando(true);
              }}
              className="min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent font-[inherit] text-ink-2 transition-[color,border-color,transform] duration-instantaneo ease-mola hover:border-acento-texto active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Escanear o QR
            </button>
          )}

          {!showLinkForm && qr.escaneando && (
            <button
              type="button"
              onClick={() => qr.setEscaneando(false)}
              className="min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent font-[inherit] text-ink-2 transition-[color,border-color,transform] duration-instantaneo ease-mola hover:border-acento-texto active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </GuestShell>
  );
}
