"use client";

import { useEffect, useState } from "react";
import { ChaoConvidado } from "../telas/shell-convidado";
import { usarEscanearQr } from "@/lib/escanear-qr";

/**
 * A-01 · Scanner de QR — primeira superfície antes do evento.
 *
 * Visor ao vivo em tela cheia; fallback "Já tenho o link" para colar o código.
 */
export function PaginaEscanear() {
  const qr = usarEscanearQr();
  const { podeEscanear, setEscaneando } = qr;
  const [mostrarLink, setMostrarLink] = useState(!podeEscanear);

  useEffect(() => {
    if (podeEscanear && !mostrarLink) {
      setEscaneando(true);
    }
  }, [podeEscanear, mostrarLink, setEscaneando]);

  return (
    <ChaoConvidado semStatus>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <style>{ESTILO}</style>

        {!mostrarLink && (
          <div className="esc-visor">
            {qr.escaneando && (
              <>
                <video
                  ref={qr.visor}
                  muted
                  playsInline
                  aria-label="Câmera apontada para o QR"
                />
                <span className="esc-mira" aria-hidden />
                <p className="esc-titulo">Aponte para o QR da festa</p>
              </>
            )}
          </div>
        )}

        <div className="esc-rodape">
          {mostrarLink ? (
            <form onSubmit={qr.enviarCodigo} className="esc-form">
              <p className="esc-rotulo">Código da mesa</p>
              <input
                ref={qr.campo}
                className="esc-campo"
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
              />
              <button type="submit" className="esc-primario" disabled={qr.codigo.trim().length === 0}>
                Entrar
              </button>
              {qr.naoEntendi && (
                <p role="alert" className="esc-erro">
                  Esse endereço não abre nenhuma festa. Confira o código da mesa.
                </p>
              )}
            </form>
          ) : (
            <button type="button" className="esc-fino" onClick={() => setMostrarLink(true)}>
              Já tenho o link
            </button>
          )}

          {mostrarLink && qr.podeEscanear && (
            <button
              type="button"
              className="esc-fino"
              onClick={() => {
                setMostrarLink(false);
                qr.setEscaneando(true);
              }}
            >
              Escanear o QR
            </button>
          )}

          {!mostrarLink && qr.escaneando && (
            <button type="button" className="esc-fino" onClick={() => qr.setEscaneando(false)}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </ChaoConvidado>
  );
}

const ESTILO = `
.esc-visor {
  position: relative;
  flex: 1;
  min-height: 0;
  background: var(--superficie);
}
.esc-visor video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.esc-mira {
  position: absolute;
  inset: 18%;
  border: 1px solid var(--acento);
  border-radius: var(--raio);
  pointer-events: none;
  box-shadow: 0 0 0 9999px color-mix(in srgb, var(--noite) 35%, transparent);
}
.esc-titulo {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  left: 1.125rem;
  right: 1.125rem;
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 1.125rem;
  font-weight: 400;
  letter-spacing: var(--tracking-titulo);
  text-align: center;
  color: var(--ink);
  text-shadow: 0 1px 4px var(--bg);
}
.esc-rodape {
  flex: none;
  padding: 1rem 1.125rem calc(1.25rem + env(safe-area-inset-bottom));
  display: grid;
  gap: 0.75rem;
}
.esc-form {
  display: grid;
  gap: 0.75rem;
}
.esc-rotulo {
  margin: 0;
  font-size: 0.6875rem;
  letter-spacing: var(--tracking-rotulo);
  text-transform: uppercase;
  color: var(--ink-3);
}
.esc-campo {
  width: 100%;
  min-height: 52px;
  padding: 0 0.875rem;
  font: inherit;
  font-size: 1rem;
  border: 1px solid var(--linha);
  border-radius: var(--raio-pilula);
  background: var(--bg);
  color: var(--ink);
}
.esc-primario {
  min-height: 52px;
  border: none;
  border-radius: var(--raio-pilula);
  background: var(--acento);
  color: var(--sobre-acento);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.esc-primario:disabled { opacity: 0.45; cursor: default; }
.esc-fino {
  min-height: 48px;
  border: 1px solid var(--linha);
  border-radius: var(--raio-pilula);
  background: transparent;
  color: var(--ink-2);
  font: inherit;
  cursor: pointer;
}
.esc-erro {
  margin: 0;
  font-size: 0.85rem;
  color: var(--critico);
}
`;
