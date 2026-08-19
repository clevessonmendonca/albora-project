"use client";

import { AJUSTES_NEUTROS, saoNeutros, type AjustesManuais, type Preset, type TextoComposto } from "@albora/core";
import type { Dispatch, SetStateAction } from "react";
import { LIMITE_TEXTO } from "./editor-texto";
import { PASSOS_BIPOLAR, PASSOS_UNIPOLAR, SEM_FILTRO } from "./editor-lut";

type Aba = "filtros" | "ajustes" | "texto";

export function EditorStyles() {
  return <style>{ESTILO}</style>;
}

export function EditorHeader({
  escolhido,
  onDescartar,
  onSemFiltro,
}: {
  escolhido: Preset | null;
  onDescartar: () => void;
  onSemFiltro: () => void;
}) {
  return (
    <header className="flex items-center justify-between px-6 pt-3">
      <button className="ed-texto" onClick={onDescartar}>
        Tirar outra
      </button>
      {escolhido && (
        <button className="ed-texto" onClick={onSemFiltro}>
          Sem filtro
        </button>
      )}
    </header>
  );
}

export function EditorControls({
  aba,
  onAba,
  ajustes,
  onAjustes,
  escolhido,
  onEscolhido,
  intensidade,
  onIntensidade,
  presets,
  recomendadoId,
  tiras,
  previaPronta,
  texto,
  onTexto,
  onRemoverTexto,
  onEnviar,
}: {
  aba: Aba;
  onAba: (aba: Aba) => void;
  ajustes: AjustesManuais;
  onAjustes: Dispatch<SetStateAction<AjustesManuais>>;
  escolhido: Preset | null;
  onEscolhido: (preset: Preset | null) => void;
  intensidade: number;
  onIntensidade: (valor: number) => void;
  presets: readonly Preset[];
  recomendadoId: string | null;
  tiras: Map<string, string>;
  previaPronta: boolean;
  /** Texto do composer, se o convidado já escreveu algo (spec 020). */
  texto: TextoComposto | null;
  onTexto: (conteudo: string) => void;
  onRemoverTexto: () => void;
  onEnviar: () => void;
}) {
  const podeZerar = !saoNeutros(ajustes);

  return (
    <footer className="grid gap-3 px-6 pb-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <span />
        <div className="flex gap-7">
          <ButtonAba rotulo="Filtros" ativa={aba === "filtros"} onClick={() => onAba("filtros")} />
          <ButtonAba rotulo="Ajustes" ativa={aba === "ajustes"} onClick={() => onAba("ajustes")} />
          <ButtonAba rotulo="Texto" ativa={aba === "texto"} onClick={() => onAba("texto")} />
        </div>
        {podeZerar && aba === "ajustes" ? (
          <button
            className="ed-reset"
            aria-label="Zerar os ajustes"
            onClick={() => onAjustes(AJUSTES_NEUTROS)}
          >
            Zerar
          </button>
        ) : (
          <span />
        )}
      </div>

      {aba === "filtros" && (
        <>
          <div className="flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none]">
            <Chip
              rotulo="Original"
              miniatura={tiras.get(SEM_FILTRO)}
              ativo={escolhido === null}
              onClick={() => onEscolhido(null)}
            />
            {presets.map((p) => (
              <Chip
                key={p.id}
                rotulo={p.nome}
                miniatura={tiras.get(p.id)}
                ativo={escolhido?.id === p.id}
                sugerido={p.id === recomendadoId}
                onClick={() => {
                  onEscolhido(p);
                  onIntensidade(1);
                }}
              />
            ))}
          </div>

          {escolhido && (
            <Deslizante
              rotulo="Intensidade"
              min={0}
              max={PASSOS_UNIPOLAR}
              valor={intensidade}
              onMudar={onIntensidade}
            />
          )}
        </>
      )}

      {aba === "ajustes" && (
        <div>
          <Deslizante
            rotulo="Luz"
            min={-PASSOS_BIPOLAR}
            max={PASSOS_BIPOLAR}
            valor={ajustes.luz}
            onMudar={(v) => onAjustes((a) => ({ ...a, luz: v }))}
          />
          <Deslizante
            rotulo="Calor"
            min={-PASSOS_BIPOLAR}
            max={PASSOS_BIPOLAR}
            valor={ajustes.calor}
            onMudar={(v) => onAjustes((a) => ({ ...a, calor: v }))}
          />
          <Deslizante
            rotulo="Contraste"
            min={-PASSOS_BIPOLAR}
            max={PASSOS_BIPOLAR}
            valor={ajustes.contraste}
            onMudar={(v) => onAjustes((a) => ({ ...a, contraste: v }))}
          />
          <Deslizante
            rotulo="Vinheta"
            min={0}
            max={PASSOS_UNIPOLAR}
            valor={ajustes.vinheta}
            onMudar={(v) => onAjustes((a) => ({ ...a, vinheta: v }))}
          />
        </div>
      )}

      {aba === "texto" && (
        <div className="grid gap-2">
          <input
            className="ed-texto-input"
            type="text"
            inputMode="text"
            placeholder="Escreva alguma coisa…"
            aria-label="Texto sobre a foto"
            maxLength={LIMITE_TEXTO}
            value={texto?.conteudo ?? ""}
            onChange={(e) => onTexto(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <p className="m-0 text-[0.78rem] leading-[1.5] text-ink-3">
              Arraste na foto para posicionar
            </p>
            {texto && (
              <button className="ed-reset" onClick={onRemoverTexto}>
                Remover
              </button>
            )}
          </div>
        </div>
      )}

      <button className="ed-primario" onClick={onEnviar} disabled={!previaPronta}>
        Enviar
      </button>
    </footer>
  );
}

function ButtonAba({
  rotulo,
  ativa,
  onClick,
}: {
  rotulo: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`ed-aba border-b ${ativa ? "border-acento text-acento-texto" : "border-transparent text-ink-3"}`}
      aria-pressed={ativa}
      onClick={onClick}
    >
      {rotulo}
    </button>
  );
}

/**
 * Um controle contínuo. `valor` chega e sai em unidade de contrato (−1 a 1 ou
 * 0 a 1); `min` e `max` são a escala que o convidado lê.
 */
function Deslizante({
  rotulo,
  min,
  max,
  valor,
  onMudar,
}: {
  rotulo: string;
  min: number;
  max: number;
  valor: number;
  onMudar: (valor: number) => void;
}) {
  const bruto = Math.round(valor * max);
  const posicao = ((bruto - min) / (max - min)) * 100;
  // O preenchimento nasce no neutro, não na ponta esquerda: num controle que
  // vai de −50 a 50 é o desvio que interessa, e é ele que a barra mostra.
  const neutro = min < 0 ? ((0 - min) / (max - min)) * 100 : 0;

  const de = Math.min(neutro, posicao);
  const ate = Math.max(neutro, posicao);

  return (
    <label className="ed-linha">
      <span className="ed-rotulo">{rotulo}</span>
      <input
        className="ed-faixa"
        type="range"
        min={min}
        max={max}
        value={bruto}
        onChange={(e) => onMudar(Number(e.target.value) / max)}
        style={
          {
            "--trilho": `linear-gradient(to right, var(--linha) 0 ${de}%, var(--acento) ${de}% ${ate}%, var(--linha) ${ate}% 100%)`,
          } as React.CSSProperties
        }
      />
      <output className="ed-valor">{bruto}</output>
    </label>
  );
}

function Chip({
  rotulo,
  miniatura,
  ativo,
  sugerido,
  onClick,
}: {
  rotulo: string;
  miniatura?: string | undefined;
  ativo: boolean;
  sugerido?: boolean | undefined;
  onClick: () => void;
}) {
  return (
    <button
      className={`ed-chip ${ativo ? "ativo" : ""} ${ativo || sugerido ? "text-acento-texto" : "text-ink-3"}`}
      onClick={onClick}
      aria-pressed={ativo}
    >
      <span
        className="ed-mini"
        style={{
          backgroundImage: miniatura ? `url(${miniatura})` : undefined,
        }}
      >
        {/* O selo do filtro que os noivos sugerem. Disco pequeno, não etiqueta:
            âmbar entra como metal, e o primeiro lugar na tira já é o destaque. */}
        {sugerido && <span className="ed-selo" aria-hidden="true" />}
      </span>
      <span className="ed-nome">{rotulo}</span>
    </button>
  );
}

/**
 * Vive num `<style>` e não em estilo inline porque trilho e botão do controle
 * só existem como pseudo-elemento. As regras `-webkit-` e `-moz-` ficam
 * separadas de propósito: juntas, o pseudo-elemento desconhecido invalidaria a
 * regra inteira nos dois navegadores.
 */
const ESTILO = `
  .ed-texto {
    font: inherit;
    font-family: var(--fonte-titulo);
    font-size: 0.68rem;
    font-weight: 400;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    background: none;
    border: 0;
    min-height: 48px;
    padding: 0 0.125rem;
    color: var(--ink-2);
    cursor: pointer;
    transition: color var(--tempo-rapido) var(--curva);
  }

  .ed-aba {
    font: inherit;
    font-family: var(--fonte-titulo);
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    background: none;
    border: 0;
    border-bottom: 1px solid transparent;
    min-height: 48px;
    padding: 0 0.25rem;
    cursor: pointer;
    transition: color var(--tempo-rapido) var(--curva), border-color var(--tempo-rapido) var(--curva);
  }

  .ed-reset {
    font: inherit;
    font-family: var(--fonte-titulo);
    font-size: 0.62rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    background: none;
    border: 0;
    color: var(--ink-3);
    min-height: 48px;
    padding: 0 0.25rem;
    justify-self: end;
    cursor: pointer;
  }

  .ed-chip {
    font: inherit;
    flex: 0 0 auto;
    width: 64px;
    display: grid;
    gap: 0.45rem;
    justify-items: center;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    transition: opacity var(--tempo-rapido) var(--curva);
  }
  .ed-chip:active { opacity: 0.85; }

  .ed-mini {
    position: relative;
    display: block;
    width: 64px;
    height: 64px;
    border-radius: var(--raio);
    overflow: hidden;
    background-color: var(--superficie-alta);
    background-size: cover;
    background-position: center;
    box-shadow: inset 0 0 0 1px var(--linha);
    transition: box-shadow var(--tempo-rapido) var(--curva);
  }
  .ed-chip.ativo .ed-mini { box-shadow: inset 0 0 0 2.5px var(--acento); }

  .ed-selo {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 9px;
    height: 9px;
    border-radius: var(--raio-pilula);
    background: var(--acento);
  }

  .ed-nome {
    max-width: 100%;
    font-family: var(--fonte-titulo);
    font-size: 0.58rem;
    font-weight: 400;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ed-primario {
    font: inherit;
    font-size: 0.97rem;
    font-weight: 500;
    letter-spacing: var(--tracking-rotulo);
    min-height: 58px;
    padding: 0 1.5rem;
    border: 0;
    border-radius: var(--raio-pilula);
    background: var(--ink);
    color: var(--bg);
    cursor: pointer;
    transition: transform var(--tempo-rapido) var(--curva), opacity var(--tempo-rapido) var(--curva);
  }
  .ed-primario:disabled { opacity: 0.35; cursor: default; }
  .ed-primario:active:not(:disabled) { transform: scale(0.97); }

  .ed-texto-input {
    font: inherit;
    font-family: var(--fonte-corpo);
    font-size: 0.94rem;
    min-height: 48px;
    padding: 0 0.125rem;
    border: 0;
    border-bottom: 1px solid var(--linha);
    background: none;
    color: var(--ink);
  }
  .ed-texto-input::placeholder { color: var(--ink-3); }
  .ed-texto-input:focus-visible {
    outline: 1px solid var(--acento);
    outline-offset: 3px;
  }

  .ed-texto:focus-visible,
  .ed-aba:focus-visible,
  .ed-reset:focus-visible,
  .ed-chip:focus-visible,
  .ed-primario:focus-visible {
    outline: 1px solid var(--acento);
    outline-offset: 5px;
  }

  .ed-linha {
    display: grid;
    grid-template-columns: 5.4rem 1fr 2.4rem;
    gap: 0.75rem;
    align-items: center;
  }

  .ed-rotulo {
    font-family: var(--fonte-titulo);
    font-size: 0.62rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-2);
  }

  .ed-valor {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.68rem;
    color: var(--ink-3);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .ed-faixa {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 48px;
    margin: 0;
    background: transparent;
    outline: none;
  }

  /*
    Trilho de 1,5px: progresso é filete, não barra. O botão continua largo
    porque quem arrasta está de pé, no escuro — a área de toque é o input
    inteiro, de 48px de altura.
  */
  .ed-faixa::-webkit-slider-runnable-track {
    height: 1.5px;
    background: var(--trilho);
  }

  .ed-faixa::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    margin-top: -11.25px;
    border: 0;
    border-radius: var(--raio-pilula);
    background: var(--ink);
    cursor: pointer;
  }

  .ed-faixa::-moz-range-track {
    height: 1.5px;
    background: var(--trilho);
  }

  .ed-faixa::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: var(--raio-pilula);
    background: var(--ink);
    cursor: pointer;
  }

  .ed-faixa:focus-visible::-webkit-slider-thumb {
    outline: 2px solid var(--acento);
    outline-offset: 2px;
  }

  .ed-faixa:focus-visible::-moz-range-thumb {
    outline: 2px solid var(--acento);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ed-texto, .ed-aba, .ed-mini, .ed-primario, .ed-chip { transition: none; }
    .ed-primario:active:not(:disabled), .ed-chip:active { transform: none; opacity: 1; }
  }
`;
