"use client";

import Link from "next/link";
import { useScanQr } from "@/features/guest/hooks/scan-qr";

export function RescueScanner() {
  const qr = useScanQr();

  return (
    <section className="resgate">
      <style>{ESTILO}</style>

      <p className="resgate-rotulo">Código da mesa</p>

      <form onSubmit={qr.enviarCodigo} className="resgate-linha">
        <input
          ref={qr.campo}
          className="resgate-campo"
          value={qr.codigo}
          onChange={(evento) => {
            qr.setCodigo(evento.target.value);
            qr.setNaoEntendi(false);
          }}
          placeholder="o código impresso"
          maxLength={80}
          required
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label="Código da mesa"
        />
        <button type="submit" className="resgate-primario" disabled={qr.codigo.trim().length === 0}>
          Entrar
        </button>
      </form>

      {qr.naoEntendi && (
        <p role="alert" className="resgate-recado">
          Esse código não parece certo. Confira as letras impressas na mesa.
        </p>
      )}

      {qr.podeEscanear && !qr.escaneando && (
        <button type="button" className="resgate-fino" onClick={() => qr.setEscaneando(true)}>
          Escanear o QR
        </button>
      )}

      {qr.escaneando && (
        <div className="resgate-visor">
          <video ref={qr.visor} muted playsInline aria-label="Câmera apontada para o QR" />
          <span className="resgate-mira" />
        </div>
      )}

      {qr.escaneando && (
        <>
          <p className="resgate-dica">Aponte para o QR da mesa.</p>
          <button type="button" className="resgate-fino" onClick={() => qr.setEscaneando(false)}>
            Cancelar
          </button>
        </>
      )}

      <Link href="/scan" className="resgate-fino" style={{ textAlign: "center", textDecoration: "none" }}>
        Abrir scanner em tela cheia
      </Link>
    </section>
  );
}

const ESTILO = `
.resgate {
  margin-top: calc(var(--espaco) * 10);
  padding-top: calc(var(--espaco) * 8);
  border-top: 1px solid var(--linha);
  text-align: left;
  display: grid;
  gap: calc(var(--espaco) * 3);
}
.resgate-rotulo {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.resgate-linha {
  display: flex;
  align-items: flex-end;
  gap: calc(var(--espaco) * 3);
}
.resgate-campo {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 56px;
  font-family: var(--fonte-titulo);
  font-size: 1.5rem;
  font-weight: 400;
  letter-spacing: var(--tracking-titulo);
  color: var(--ink);
  background: transparent;
  border: none;
  border-radius: 0;
  border-bottom: 1.5px solid var(--linha);
  padding: calc(var(--espaco) * 2) 2px calc(var(--espaco) * 3);
  outline: none;
  transition: border-color var(--tempo-rapido) var(--curva);
}
.resgate-campo::placeholder {
  color: var(--ink-3);
  font-style: italic;
}
.resgate-campo:focus {
  border-bottom-color: var(--acento);
}
.resgate-primario {
  flex: 0 0 auto;
  font: inherit;
  font-size: 0.97rem;
  font-weight: 500;
  letter-spacing: var(--tracking-rotulo);
  min-height: 56px;
  padding: 0 calc(var(--espaco) * 7);
  border: none;
  border-radius: var(--raio-pilula);
  background: var(--ink);
  color: var(--bg);
  cursor: pointer;
  transition: transform var(--tempo-rapido) var(--curva), opacity var(--tempo-rapido) var(--curva);
}
.resgate-primario:hover:not(:disabled) {
  opacity: 0.88;
}
.resgate-primario:disabled {
  opacity: 0.4;
  cursor: default;
}
.resgate-primario:active:not(:disabled) {
  transform: scale(0.972);
}
.resgate-fino {
  font: inherit;
  font-size: 0.97rem;
  font-weight: 400;
  letter-spacing: var(--tracking-rotulo);
  min-height: 52px;
  padding: 0 calc(var(--espaco) * 6);
  background: transparent;
  color: var(--ink-2);
  border: 1px solid var(--linha);
  border-radius: var(--raio-pilula);
  cursor: pointer;
  transition: transform var(--tempo-rapido) var(--curva), opacity var(--tempo-rapido) var(--curva);
}
.resgate-fino:hover {
  opacity: 0.75;
}
.resgate-fino:active {
  transform: scale(0.972);
}
.resgate-primario:focus-visible,
.resgate-fino:focus-visible {
  outline: 1px solid var(--acento);
  outline-offset: 4px;
}
.resgate-recado {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--critico);
}
.resgate-dica {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-2);
}
.resgate-visor {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--raio-superficie);
  overflow: hidden;
  background: var(--superficie);
}
.resgate-visor video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.resgate-mira {
  position: absolute;
  inset: 15%;
  border: 1px solid var(--acento);
  border-radius: var(--raio);
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .resgate-campo,
  .resgate-primario,
  .resgate-fino {
    transition: none;
  }
  .resgate-primario:active:not(:disabled),
  .resgate-fino:active {
    transform: none;
  }
  .resgate-primario:hover:not(:disabled),
  .resgate-fino:hover {
    opacity: 1;
  }
}
`;
