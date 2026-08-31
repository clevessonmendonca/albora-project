"use client";

import { AJUSTES_NEUTROS, saoNeutros, type AjustesManuais, type Preset, type TextoComposto } from "@albora/core";
import type { Dispatch, SetStateAction } from "react";
import type { FaixaVotada } from "./editor-musica";
import { ButtonAba } from "../editor/button-aba";
import { FiltrosTab } from "../editor/filtros-tab";
import { AjustesTab } from "../editor/ajustes-tab";
import { TextoTab } from "../editor/texto-tab";
import { PainelMusica } from "../editor/painel-musica";

type Aba = "filtros" | "ajustes" | "texto" | "musica";

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

type EditorControlsProps = {
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
  texto: TextoComposto | null;
  onTexto: (conteudo: string) => void;
  onRemoverTexto: () => void;
  musicas: readonly FaixaVotada[];
  musicaId: string | null;
  onMusica: (id: string | null) => void;
  onEnviar: () => void;
};

/**
 * Controles do editor de foto.
 * Orquestra 4 abas: filtros, ajustes, texto, música.
 */
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
  musicas,
  musicaId,
  onMusica,
  onEnviar,
}: EditorControlsProps) {
  const podeZerar = !saoNeutros(ajustes);

  return (
    <footer className="grid gap-3 px-6 pb-6">
      {/* Header das abas */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <span />
        <div className="flex gap-7">
          <ButtonAba
            rotulo="Filtros"
            ativa={aba === "filtros"}
            onClick={() => onAba("filtros")}
          />
          <ButtonAba
            rotulo="Ajustes"
            ativa={aba === "ajustes"}
            onClick={() => onAba("ajustes")}
          />
          <ButtonAba
            rotulo="Texto"
            ativa={aba === "texto"}
            onClick={() => onAba("texto")}
          />
          <ButtonAba
            rotulo="Música"
            ativa={aba === "musica"}
            onClick={() => onAba("musica")}
          />
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

      {/* Conteúdo das abas */}
      {aba === "filtros" && (
        <FiltrosTab
          escolhido={escolhido}
          onEscolhido={onEscolhido}
          intensidade={intensidade}
          onIntensidade={onIntensidade}
          presets={presets}
          recomendadoId={recomendadoId}
          tiras={tiras}
        />
      )}

      {aba === "ajustes" && (
        <AjustesTab ajustes={ajustes} onAjustes={onAjustes} />
      )}

      {aba === "texto" && (
        <TextoTab
          texto={texto}
          onTexto={onTexto}
          onRemoverTexto={onRemoverTexto}
        />
      )}

      {aba === "musica" && (
        <PainelMusica
          musicas={musicas}
          musicaId={musicaId}
          onMusica={onMusica}
        />
      )}

      {/* Botão primário */}
      <button
        className="ed-primario"
        onClick={onEnviar}
        disabled={!previaPronta}
      >
        Enviar
      </button>
    </footer>
  );
}

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
  .ed-texto:hover { color: var(--ink); }

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
    transition: color var(--tempo-rapido) var(--curva);
  }
  .ed-reset:hover { color: var(--ink-2); }

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
  .ed-chip:not(.ativo):hover { opacity: 0.75; }
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

  .ed-musica-lista {
    max-height: 9.5rem;
  }

  .ed-musica-item {
    font: inherit;
    display: block;
    width: 100%;
    min-height: 48px;
    padding: 0 0.75rem;
    border: 1px solid var(--linha);
    border-radius: var(--raio);
    background: none;
    text-align: left;
    font-size: 0.85rem;
    color: var(--ink-2);
    cursor: pointer;
    transition: border-color var(--tempo-rapido) var(--curva), color var(--tempo-rapido) var(--curva);
  }
  .ed-musica-item:not(.ativo):hover { border-color: var(--acento-borda); color: var(--ink); }
  .ed-musica-item.ativo {
    border-color: var(--acento);
    color: var(--ink);
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
  .ed-primario:hover:not(:disabled) { opacity: 0.88; }
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
  .ed-musica-item:focus-visible,
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

  .ed-aba:not([aria-pressed="true"]):hover { color: var(--ink-2); }

  @media (prefers-reduced-motion: reduce) {
    .ed-texto, .ed-aba, .ed-reset, .ed-mini, .ed-primario, .ed-chip, .ed-musica-item { transition: none; }
    .ed-primario:active:not(:disabled), .ed-chip:active { transform: none; opacity: 1; }
    .ed-primario:hover:not(:disabled), .ed-chip:not(.ativo):hover { opacity: 1; }
  }
`;
