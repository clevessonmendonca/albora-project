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
        display: "flex",
        flexDirection: "column",
        padding: "2.5rem 2rem 2.25rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <style>{ESTILO}</style>

      <div style={{ flex: "none" }}>
        <h1 className="det-titulo">Sua foto já está subindo</h1>
        <p className="det-lede">Se quiser, conte alguma coisa sobre ela.</p>
      </div>

      <label style={{ display: "grid", gap: "0.3rem", marginTop: "2rem", flex: "none" }}>
        <span style={ROTULO}>Legenda</span>
        <textarea
          className="det-legenda"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value.slice(0, MAX_LEGENDA))}
          rows={2}
          placeholder="Escreve alguma coisa…"
        />
      </label>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "2rem", flex: "none" }}>
        <span style={ROTULO}>{perguntaDoLugar}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {lugares.map((l) => (
            <button
              key={l.id}
              className={lugar === l.id ? "det-lugar ativo" : "det-lugar"}
              onClick={() => setLugar(lugar === l.id ? null : l.id)}
              aria-pressed={lugar === l.id}
            >
              {l.titulo}
            </button>
          ))}
        </div>
      </div>

      <span style={{ flex: "1 1 auto", minHeight: "2rem" }} />

      <div style={{ display: "grid", gap: "0.25rem", flex: "none" }}>
        <button className="det-primario" onClick={concluir}>
          Pronto
        </button>
        <button className="det-pular" onClick={concluir}>
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

const ESTILO = `
.det-titulo {
  font-family: var(--fonte-titulo);
  font-size: clamp(1.5rem, 7vw, 1.75rem);
  font-weight: 500;
  line-height: 1.16;
  letter-spacing: var(--tracking-titulo);
  margin: 0 0 0.5rem;
  text-wrap: balance;
}

.det-lede {
  margin: 0;
  max-width: 34ch;
  font-size: 0.94rem;
  line-height: 1.68;
  color: var(--ink-2);
}

.det-legenda {
  width: 100%;
  font-family: var(--fonte-titulo);
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.42;
  color: var(--ink);
  background: transparent;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--linha);
  padding: 0.8rem 0.125rem;
  resize: none;
  outline: none;
  transition: border-color var(--tempo-rapido) var(--curva);
}
.det-legenda::placeholder { color: var(--ink-3); font-style: italic; }
.det-legenda:focus { border-bottom-color: var(--acento); }

/*
  Pílula de filete, nunca preenchida: âmbar é metal, não tinta — o estado ativo
  ganha borda e texto de acento, não um bloco de cor (DESIGN.md §6).
*/
.det-lugar {
  font: inherit;
  font-family: var(--fonte-titulo);
  font-size: 0.9rem;
  font-weight: 400;
  min-height: 48px;
  padding: 0 1.15rem;
  border: 1px solid var(--linha);
  border-radius: var(--raio-pilula);
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
  transition: color var(--tempo-rapido) var(--curva), border-color var(--tempo-rapido) var(--curva);
}
.det-lugar.ativo {
  border-color: var(--acento);
  color: var(--acento-texto);
}

.det-primario {
  font: inherit;
  font-size: 0.97rem;
  font-weight: 500;
  letter-spacing: var(--tracking-rotulo);
  min-height: 56px;
  padding: 0 1.5rem;
  border: none;
  border-radius: var(--raio-pilula);
  background: var(--ink);
  color: var(--bg);
  cursor: pointer;
  transition: transform var(--tempo-rapido) var(--curva);
}
.det-primario:active { transform: scale(0.972); }

.det-pular {
  font: inherit;
  font-family: var(--fonte-titulo);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  min-height: 48px;
  background: none;
  border: 0;
  color: var(--ink-3);
  cursor: pointer;
  transition: color var(--tempo-rapido) var(--curva);
}

.det-lugar:focus-visible,
.det-primario:focus-visible,
.det-pular:focus-visible {
  outline: 1px solid var(--acento);
  outline-offset: 5px;
}

@media (prefers-reduced-motion: reduce) {
  .det-legenda, .det-lugar, .det-primario, .det-pular { transition: none; }
  .det-primario:active { transform: none; }
}
`;
