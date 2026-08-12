"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { raio } from "../landing/pecas";

/**
 * A tela que liga o telão (spec 010).
 *
 * Aberta por quem já está no evento — pelo QR do telão (código pré-preenchido)
 * ou digitando o código nas configurações. Autoriza com a **sessão** de quem
 * está aqui; o evento sai dela, nunca do campo. Consentir é ligar: expor as
 * fotos publicadas numa tela do salão é decisão de quem toca o botão.
 */

const CODIGO = /^[A-HJ-NP-Z2-9]{6}$/;

type Estado = "editando" | "enviando" | "ligado" | "sem-sessao" | "recusado" | "erro";

export function Parear({ codigoInicial }: { codigoInicial: string }) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [estado, setEstado] = useState<Estado>("editando");

  const valido = CODIGO.test(codigo.trim().toUpperCase());

  const ligar = async () => {
    if (!valido) return;
    setEstado("enviando");
    try {
      const r = await fetch("/api/parede/autorizar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim().toUpperCase() }),
      });
      if (r.ok) setEstado("ligado");
      else if (r.status === 401) setEstado("sem-sessao");
      else if (r.status === 409 || r.status === 422) setEstado("recusado");
      else setEstado("erro");
    } catch {
      setEstado("erro");
    }
  };

  const cartao: CSSProperties = {
    width: "min(28rem, 100%)",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    padding: "2rem",
    backgroundColor: "var(--superficie)",
    ...raio("var(--raio-superficie)"),
  };

  if (estado === "ligado") {
    return (
      <Moldura>
        <div style={cartao}>
          <h1 style={titulo}>Telão ligado</h1>
          <p style={corpo}>As fotos publicadas já estão aparecendo na tela do salão.</p>
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura>
      <div style={cartao}>
        <h1 style={titulo}>Ligar o telão</h1>
        <p style={corpo}>Digite o código que aparece na tela do salão.</p>

        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={6}
          placeholder="A2C4E6"
          aria-label="Código do telão"
          style={{
            padding: "0.875rem 1rem",
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.75rem",
            letterSpacing: "0.35em",
            textAlign: "center",
            textTransform: "uppercase",
            color: "var(--ink)",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--linha)",
            ...raio("var(--raio)"),
          }}
        />

        {estado === "sem-sessao" && (
          <p style={aviso}>Entre no evento pelo QR da mesa antes de ligar o telão.</p>
        )}
        {estado === "recusado" && <p style={aviso}>Código inválido ou expirado. Confira na tela.</p>}
        {estado === "erro" && <p style={aviso}>Não deu para ligar agora. Tente de novo.</p>}

        <button
          type="button"
          onClick={ligar}
          disabled={!valido || estado === "enviando"}
          style={{
            padding: "0.875rem 1rem",
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.05rem",
            color: "var(--sobre-acento)",
            backgroundColor: "var(--acento)",
            border: "none",
            cursor: valido ? "pointer" : "default",
            opacity: valido && estado !== "enviando" ? 1 : 0.5,
            ...raio("var(--raio-pilula)"),
          }}
        >
          {estado === "enviando" ? "Ligando…" : "Ligar o telão"}
        </button>
      </div>
    </Moldura>
  );
}

const titulo: CSSProperties = {
  margin: 0,
  fontFamily: "var(--fonte-titulo)",
  fontSize: "1.5rem",
  color: "var(--ink)",
};
const corpo: CSSProperties = { margin: 0, color: "var(--ink-2)", lineHeight: 1.5 };
const aviso: CSSProperties = { margin: 0, color: "var(--critico)", fontSize: "0.9rem" };

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      {children}
    </main>
  );
}
