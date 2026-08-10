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
        background: "var(--fundo)",
        color: "var(--frente)",
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
          Já está subindo
        </h1>
        <p style={{ margin: 0, opacity: 0.6, lineHeight: 1.6 }}>
          Se quiser, conte alguma coisa sobre ela.
        </p>
      </div>

      <label style={{ display: "grid", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.78rem", opacity: 0.55 }}>Legenda</span>
        <textarea
          value={legenda}
          onChange={(e) => setLegenda(e.target.value.slice(0, MAX_LEGENDA))}
          rows={2}
          placeholder="Opcional"
          style={{
            font: "inherit",
            fontSize: "1rem",
            padding: "0.75rem 0.9rem",
            borderRadius: "var(--raio)",
            border: "1px solid color-mix(in srgb, var(--frente) 22%, transparent)",
            background: "transparent",
            color: "var(--frente)",
            resize: "none",
          }}
        />
      </label>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.78rem", opacity: 0.55 }}>{perguntaDoLugar}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {lugares.map((l) => (
            <button
              key={l.id}
              onClick={() => setLugar(lugar === l.id ? null : l.id)}
              aria-pressed={lugar === l.id}
              style={{
                font: "inherit",
                fontSize: "0.9rem",
                minHeight: "44px",
                padding: "0 1rem",
                borderRadius: "999px",
                cursor: "pointer",
                background: lugar === l.id ? "var(--frente)" : "transparent",
                color: lugar === l.id ? "var(--fundo)" : "var(--frente)",
                border: "1px solid color-mix(in srgb, var(--frente) 22%, transparent)",
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

function botao(primario: boolean): React.CSSProperties {
  return {
    font: "inherit",
    fontSize: "1rem",
    fontWeight: 500,
    minHeight: "48px",
    borderRadius: "var(--raio)",
    cursor: "pointer",
    background: primario ? "var(--frente)" : "transparent",
    color: primario ? "var(--fundo)" : "var(--frente)",
    border: primario ? "none" : "1px solid color-mix(in srgb, var(--frente) 22%, transparent)",
  };
}
