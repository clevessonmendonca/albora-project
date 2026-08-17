"use client";

import { useEffect, useState } from "react";
import { GuestShell } from "@albora/ui-web";
import { useScanQr } from "@/features/guest/hooks/scan-qr";

/**
 * A-01 · Scanner de QR — primeira superfície antes do evento.
 *
 * Visor ao vivo em tela cheia; fallback "Já tenho o link" para colar o código.
 */
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
      <div className="flex min-h-dvh flex-1 flex-col">
        {!showLinkForm && (
          <div className="relative min-h-0 flex-1 bg-superficie">
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
                <p className="absolute left-[1.125rem] right-[1.125rem] top-[max(1rem,env(safe-area-inset-top))] m-0 text-center font-titulo text-lg font-normal tracking-titulo text-ink [text-shadow:0_1px_4px_var(--bg)]">
                  Aponte para o QR da festa
                </p>
              </>
            )}
          </div>
        )}

        <div className="grid flex-none gap-3 px-[1.125rem] pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
          {showLinkForm ? (
            <form onSubmit={qr.enviarCodigo} className="grid gap-3">
              <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                Código da mesa
              </p>
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
                className="min-h-[52px] w-full rounded-pilula border border-linha bg-bg px-3.5 text-base text-ink"
              />
              <button
                type="submit"
                disabled={qr.codigo.trim().length === 0}
                className="min-h-[52px] cursor-pointer rounded-pilula border-none bg-acento font-[inherit] font-semibold text-sobre-acento disabled:cursor-default disabled:opacity-45"
              >
                Entrar
              </button>
              {qr.naoEntendi && (
                <p role="alert" className="m-0 text-[0.85rem] text-critico">
                  Esse código não abre nenhum evento. Confere de novo? Às vezes é só um zero no lugar do O.
                </p>
              )}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowLinkForm(true)}
              className="min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent font-[inherit] text-ink-2"
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
              className="min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent font-[inherit] text-ink-2"
            >
              Escanear o QR
            </button>
          )}

          {!showLinkForm && qr.escaneando && (
            <button
              type="button"
              onClick={() => qr.setEscaneando(false)}
              className="min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent font-[inherit] text-ink-2"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </GuestShell>
  );
}
