"use client";

import { useState } from "react";

/**
 * Legenda e lugar, **com a foto já subindo**.
 *
 * Por isso não custa toque no caminho crítico: esse tempo ia passar de
 * qualquer jeito. E por isso os dois botões de saída levam ao mesmo lugar —
 * uma tela opcional que parece obrigatória é uma tela obrigatória (N6.8).
 */

export type Lugar = { id: string; titulo: string };

const MAX_LEGENDA = 280;

export function Detalhes({
  lugares,
  perguntaDoLugar,
  onPronto,
}: {
  lugares: Lugar[];
  perguntaDoLugar: string;
  onPronto: (detalhes: { legenda: string | null; lugar: string | null }) => void;
}) {
  const [legenda, setLegenda] = useState("");
  const [lugar, setLugar] = useState<string | null>(null);

  const concluir = () =>
    onPronto({ legenda: legenda.trim() || null, lugar });

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        alignContent: "start",
        gap: "1.5rem",
        padding: "2rem 1.5rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.5rem",
            fontWeight: 500,
            margin: "0 0 0.4rem",
          }}
        >
          Sua foto já está subindo
        </h1>
        <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
          Se quiser, conte alguma coisa sobre ela.
        </p>
      </div>

      <style>{ESTILO_LEGENDA}</style>

      <label style={{ display: "grid", gap: "0.4rem" }}>
        <span style={ROTULO}>Legenda</span>
        <textarea
          className="detalhes-legenda"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value.slice(0, MAX_LEGENDA))}
          rows={2}
          placeholder="Escreve alguma coisa…"
          style={{
            font: "inherit",
            fontSize: "1rem",
            padding: "0.75rem 0.9rem",
            borderRadius: "var(--raio)",
            border: "1px solid var(--linha)",
            background: "transparent",
            color: "var(--ink)",
            resize: "none",
          }}
        />
      </label>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        <span style={ROTULO}>{perguntaDoLugar}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {lugares.map((l) => (
            <button
              key={l.id}
              onClick={() => setLugar(lugar === l.id ? null : l.id)}
              aria-pressed={lugar === l.id}
              style={{
                font: "inherit",
                fontSize: "0.9rem",
                minHeight: "48px",
                padding: "0 1rem",
                borderRadius: "999px",
                cursor: "pointer",
                background: lugar === l.id ? "var(--ink)" : "transparent",
                color: lugar === l.id ? "var(--bg)" : "var(--ink)",
                border: "1px solid var(--linha)",
              }}
            >
              {l.titulo}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.6rem", marginTop: "0.5rem" }}>
        <button onClick={concluir} style={botao(true)}>
          Pronto
        </button>
        <button onClick={concluir} style={botao(false)}>
          Pular — já está subindo
        </button>
      </div>
    </main>
  );
}

const ROTULO: React.CSSProperties = {
  fontFamily: "var(--fonte-titulo)",
  fontSize: "0.7rem",
  fontWeight: 400,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

const ESTILO_LEGENDA = `
.detalhes-legenda::placeholder { color: var(--ink-3); font-style: italic; }
.detalhes-legenda:focus-visible { outline: 1px solid var(--acento); outline-offset: 3px; }
`;

function botao(primario: boolean): React.CSSProperties {
  return {
    font: "inherit",
    fontSize: "1rem",
    fontWeight: 500,
    minHeight: "48px",
    borderRadius: "var(--raio)",
    cursor: "pointer",
    background: primario ? "var(--ink)" : "transparent",
    color: primario ? "var(--bg)" : "var(--ink)",
    border: primario ? "none" : "1px solid var(--linha)",
  };
}
